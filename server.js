let http = require('http');
let fs = require('fs');
let path = require('path');
let main = require('./main');
let Busboy = require('busboy');

http.createServer(function (request, response) {
    console.log('request ', request.url);

    let filePath = '.' + request.url;
    if (filePath == './') {
        filePath = './Webview/index.html';
    }

    let extname = String(path.extname(filePath)).toLowerCase();
    let mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm'
    };

    let contentType = mimeTypes[extname] || 'application/octet-stream';


    if(filePath === './processFile'){

      let busboy = new Busboy({ headers: request.headers });
      busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
        console.log(request.headers);
        let saveTo = `./gpxTracks/test.gpx`;
        file.pipe(fs.createWriteStream(saveTo));
      });

    }
    else{

          fs.readFile(filePath, function(error, content) {
              if (error) {
                  if(error.code == 'ENOENT') {
                      fs.readFile('./404.html', function(error, content) {
                          response.writeHead(404, { 'Content-Type': 'text/html' });
                          response.end(content, 'utf-8');
                      });
                  }
                  else {
                      response.writeHead(500);
                      response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
                  }
              }
              else {
                  response.writeHead(200, { 'Content-Type': contentType });
                  response.end(content, 'utf-8');
              }
          });
    }




}).listen(8125);
console.log('Server running at http://127.0.0.1:8125/');
