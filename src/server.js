const https = require('https');
const fs = require('fs');
const url = require('url');
const path = require('path');

// Generate a key with:
// $ openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 3001 -nodes
const options = {
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./cert.pem'),
};

// From https://developer.mozilla.org/en-US/docs/Node_server_without_framework
https.createServer(options, (request, response) => {

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('request ', request.url);
  }

  let filePath = `.${url.parse(request.url).pathname}`;
  if (filePath === './') {
    filePath = './index.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'applilcation/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.svg': 'application/image/svg+xml',
  };

  const contentType = mimeTypes[extname] || 'application/octect-stream';

  fs.readFile(filePath, (error, fileContent) => {

    if (error) {

      if (error.code === 'ENOENT') {

        response.writeHead(404, {'Content-Type': 'text/plain'});
        response.end('Not Found', 'utf-8');

      } else {
        response.writeHead(500);
        response.end(`Sorry, check with the site admin for error: ${error.code} ..\n`);
        response.end();
      }
    } else {
      response.writeHead(200, {'Content-Type': contentType});
      response.end(fileContent, 'utf-8');
    }

  });

}).listen(8080);

if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.log('listening on port 8080');
}
