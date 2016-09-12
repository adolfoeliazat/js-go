// import stream from './video-stream';
import aframe from 'aframe';
import aframeExtras from 'aframe-extras';

require('webrtc-adapter');

aframeExtras.physics.registerAll(aframe);
aframeExtras.primitives.registerAll(aframe);

/*
var videoElement = document.querySelector('video');

function gotStream(stream) {
  window.stream = stream; // make stream available to console
  videoElement.srcObject = stream;
}

stream().then(gotStream);
*/

const scene = document.querySelector('a-scene');

function screenCoordsToDirection(
  camera,
  {x: cameraX, y: cameraY, z: cameraZ},
  {x: clientX, y: clientY},
) {

  // scale mouse coordinates down to -1 <-> +1
  const {x: mouseX, y: mouseY} = clientCoordsTo3DCanvasCoords(
    clientX, clientY,
    0, 0, // TODO: Replace with canvas position
    window.innerWidth,
    window.innerHeight
  );

  // apply camera transformation from near-plane of mouse x/y into 3d space
  const projectedVector = new aframe.THREE
    .Vector3(mouseX, mouseY, -1)
    .unproject(camera);

  const cameraPosAsVec3 = new aframe.THREE.Vector3(cameraX, cameraY, cameraZ);

  // Get the unit length direction vector from the camera's position
  const {x, y, z} = projectedVector.sub(cameraPosAsVec3).normalize();

  return {x, y, z};
}

/**
 * @param camera Three.js Camera instance
 * @param Object Position of the camera
 * @param Object position of the mouse (scaled to be between -1 to 1)
 * @param depth Depth into the screen to calculate world coordinates for
 */
function directionToWorldCoords(
  camera,
  {x: cameraX, y: cameraY, z: cameraZ},
  {x: directionX, y: directionY, z: directionZ},
  depth
) {

  const cameraPosAsVec3 = new aframe.THREE.Vector3(cameraX, cameraY, cameraZ);
  const direction = new aframe.THREE.Vector3(directionX, directionY, directionZ);

  // Aligned to the world direction of the camera
  // At the specified depth along the z axis
  const plane = new aframe.THREE.Plane(
    camera.getWorldDirection().clone().negate(),
    depth
  );

  // A line from the camera position toward (and through) the plane
  const newPosition = plane.intersectLine(
    new aframe.THREE.Line3(
      new aframe.THREE.Vector3(),
      direction.multiplyScalar(100000.0)
    )
  );

  // Reposition back to the camera position
  const {x, y, z} = newPosition.add(cameraPosAsVec3);

  return {x, y, z};

}

function clientCoordsTo3DCanvasCoords(
  clientX,
  clientY,
  offsetX,
  offsetY,
  clientWidth,
  clientHeight
) {
  return {
    x: (((clientX - offsetX) / clientWidth) * 2) - 1,
    y: (-((clientY - offsetY) / clientHeight) * 2) + 1,
  };
}

function selectItem(camera, clientX, clientY) {

  const {x: directionX, y: directionY, z: directionZ} = screenCoordsToDirection(
    camera.components.camera.camera,
    camera.components.position.data,
    {x: clientX, y: clientY},
  );

  const {x: cameraX, y: cameraY, z: cameraZ} = camera.components.position.data;

  const cameraPosAsVec3 = new aframe.THREE.Vector3(cameraX, cameraY, cameraZ);
  const directionAsVec3 = new aframe.THREE.Vector3(directionX, directionY, directionZ);

  const raycaster = new aframe.THREE.Raycaster();

  // TODO: Schema variables
  raycaster.far = Infinity;
  raycaster.near = 0;

  raycaster.set(cameraPosAsVec3, directionAsVec3);

  const selector = '';
  let objects;

  // Push meshes onto list of objects to intersect.
  // TODO: Schema variables
  if (selector) {
    objectEls = camera.sceneEl.querySelectorAll(selector);
    objects = [];
    for (i = 0; i < objectEls.length; i++) {
      objects.push(objectEls[i].object3D);
    }
    return;
  }

  // If objects not defined, intersect with everything.
  objects = camera.sceneEl.object3D.children;

  // TODO: `recursive` as Schema variables
  const recursive = true;

  const intersected = raycaster
    .intersectObjects(objects, recursive)
    // Only keep intersections against objects that have a reference to an entity.
    .filter(intersection => !!intersection.object.el)
    // Only keep ones that are visible
    .filter(intersection => intersection.object.parent.visible)
    // The first element is the closest (TODO: Confirm this is always true)
    [0];

  if (!intersected) {
    return {};
  }

  const {point, object} = intersected;

  // Aligned to the world direction of the camera
  // At the specified intersection point
  const plane = new aframe.THREE.Plane().setFromNormalAndCoplanarPoint(
    camera.components.camera.camera.getWorldDirection().clone().negate(),
    point.clone().sub(cameraPosAsVec3)
  );

  const depth = plane.constant;

  const offset = point.sub(object.getWorldPosition());

  return {depth, offset, element: object.el};

}

function dragItem(element, offset, camera, depth) {

  const {x: offsetX, y: offsetY, z: offsetZ} = offset;

  function onMouseMove({clientX, clientY}) {

    const direction = screenCoordsToDirection(
      camera.components.camera.camera,
      camera.components.position.data,
      {x: clientX, y: clientY},
    );

    const {x, y, z} = directionToWorldCoords(
      camera.components.camera.camera,
      camera.components.position.data,
      direction,
      depth
    );

    element.setAttribute('position', {x: x - offsetX, y: y - offsetY, z: z - offsetZ});
  }

  document.addEventListener('mousemove', onMouseMove);

  // The "unlisten" function
  return _ => {
    document.removeEventListener('mousemove', onMouseMove);
  };
}

function run() {
  const sphere = document.querySelector('#monster-ball');
  const camera = scene.camera.el;
  let unlisten;

  document.addEventListener('mousedown', ({clientX, clientY}) => {
    const {depth, offset, element} = selectItem(camera, clientX, clientY);
    if (element) {
      unlisten = dragItem(element, offset, camera, depth);
    }
  });

  document.addEventListener('mouseup', _ => {
    unlisten && unlisten(); // eslint-disable-line no-unused-expressions
    unlisten = undefined;
  });
}

if (scene.hasLoaded) {
  run();
} else {
  scene.addEventListener('loaded', run);
}
