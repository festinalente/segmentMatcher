/**
  * Supplementary function: Gets segments from Strava, and transp
  * for the test route the following area was also searched for segments 37.295565, -8.430014 37.363541, -8.360319
  */

module.exports = (swpt, nept)=>{
  const https = require('https');
  const polyline = require('google-polyline');
  const fs = require('fs-extra');
  const sw = (swpt) ? swpt : `37.094813,-8.491944`;
  const ne = (nept) ? nept : `37.442916,-8.204118`;
  const url = `https://www.strava.com/api/v3/segments/explore?bounds=${sw},${ne}
  &activity_type=riding&access_token=a18142e6c5255fa087a0f78ba3c765632f64ddd7`;

  function getPolylines(){
    let segments = [];
    let chunks = [];
    let promise = new Promise((resolve, reject)=>{
      https.get(url, (res) => {
        res.on('data', (d) => {
          chunks.push(d);
        });
        res.on('end', ()=>{
          let obj = JSON.parse(chunks.join());
          resolve(obj.segments);
        });
      }).on('error', (e) => {
        console.error(e);
      });
    });
    return promise;
  }

  function makeGPX(segments){
    segments.forEach((segment, i) => {
      let gpxHeader =
      `<?xml version="1.0" encoding="UTF-8"?>
      <gpx creator="testApp" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensions/v3 http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd" version="1.1" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1" xmlns:gpxx="http://www.garmin.com/xmlschemas/GpxExtensions/v3">
      <metadata>
      <time>${new Date().toISOString()}</time>
      </metadata>
      <trk>
      <name>${segment.name}</name>
      <type>1</type>
      <trkseg>`;

      let fileLocation = `./segmentsFromStravaGPX/${segment.name}.gpx`;
      let decoded = polyline.decode(segment.points);

      decoded.forEach((point, j) => {
        //add points
        gpxHeader += `<trkpt lat="${point[0]}" lon="${point[1]}"></trkpt>`;
        if(j === decoded.length -1){
          //close file
          gpxHeader +=`</trkseg></trk></gpx>`;

          fs.ensureFile(fileLocation).then(()=>{
            fs.writeFile(fileLocation, gpxHeader);
          });

          if(i === segments.length -1){
            console.log(`GPX file made from segments`)
          }
        }
      });

    });
  }

  getPolylines().then((result)=>{
    makeGPX(result);
  });

}
