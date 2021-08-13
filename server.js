const express = require('express');
const app = express();
const path = require('path');
const routes = express.Router();
//segmentFinder
const main = require('./main.js');

const multer  = require('multer');

const bodyParser = require('body-parser');
//const passport = require('passport');
//const LocalStrategy = require('passport-local').Strategy;

const port = 8125;
const server_ip_address = '0.0.0.0' || '127.0.0.1';

routes.get('/', function (req, res, next) {
  res.sendFile(__dirname + '/webview/index.html');
});

const destination = multer.diskStorage({
        destination: 'gpxTracks/',
        filename: function ( req, file, cb ) {
            cb( null, `testGpx.gpx`);
        }
    }
);
const upload = multer({ storage: destination });

routes.post('/processFile', upload.single('gpx'), function (req, res, next) {
  (async()=>{
    let segments = await main.processFile('./gpxTracks/testGpx.gpx', false, 200);
    res.json(segments);
  })();
});

app.use(express.static(__dirname + '/webview'));

app.use('/', routes);

app.listen(port, server_ip_address, function () {
  console.log(`Listening at ip ${server_ip_address} on port ${port}`);
});
