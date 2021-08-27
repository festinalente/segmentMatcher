/**
  * @module getSegments
  * @param {number[]} swpt - An optional aray with 2 floating point numbers correspoding
  * to the latitude and longitude of the south-west corner of the desired area.
  * @param {number[]} nept - An optional aray with 2 floating point numbers correspoding
  *  to the latitude and longitude of the north-east corner of the desired area.
  * @description A rough script to pull many segments from strava for a particular
  * area. It pulls the polylines (very clever way to store segments), and then
  * turns these into GPX files. It doesn't deal with certain edge cases like slashes
  * in the segment name, ocasionally there are error thrown by JSON.parse which it skips
  * over. Due to Strava limiting segments to <10 for a given area this script breaks
  * an area up into squares roughly 5 km by 5 km.
  */

module.exports = (swpt, nept)=>{
  const https = require('https');
  const polyline = require('google-polyline');
  const fs = require('fs-extra');
  const sw = (swpt) ? swpt : [36.925186,-9.058939];
  const ne = (nept) ? nept : [37.576867,-7.409043];

  let subSectionSize = 0.05; //5 km roughly
  let squares = splitRectangle(sw, ne, subSectionSize);

  function getSegments(i, squares){

    const url = `https://www.strava.com/api/v3/segments/explore?bounds=${squares[i][0].toString()},${squares[i][1].toString()}
    &activity_type=riding&access_token=`;

    getPolylines(url).then(makeGPX).then(() =>{
      setTimeout(()=>{
        if(i < squares.length){
          getSegments(i+=1, squares);
        }
      }, 2500);
      //skip ahead and continue
    }).catch((error)=>{
      console.log(`Error ${error} for URL ${url}`);
      getSegments(i+=1, squares);
    });

  }

  getSegments(0, squares);

  function getPolylines(url){
    console.log(url);
    let segments = [];
    let chunks = [];
    let promise = new Promise((resolve, reject)=>{
      https.get(url, (res) => {
        res.on('data', (d) => {
          chunks.push(d);
        });
        res.on('end', ()=>{
          let obj;

          try {
            obj = JSON.parse(chunks.join());
          } catch(e) {
            reject(e);
          }

          resolve(obj.segments);

        });
      }).on('error', (e) => {
        reject(e);
      });
    });
    return promise;
  }

  function makeGPX(segments){
    let promise = new Promise((resolve, reject)=>{
      if(!segments || segments.length === 0){
        resolve();
      }
      else{
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
                //console.log(`GPX file made from segments`);
                resolve();
              }
            }
          });
        });
      }
    });
    return promise;
  }
}

function splitRectangle(sw, ne, subSectionSize){

  function makeSquare(originPt, subSectionSize){
    let distal = []

    distal[0] = originPt[0] + subSectionSize;
    distal[1] = originPt[1] + subSectionSize;
    return [originPt, distal];
  }

  function makeRow(sw, ne, subSectionSize){
    let squares = [];
    let i = sw[0];

    while(i < ne[0]){
      let t = makeSquare([i, sw[1]], subSectionSize);
      i += subSectionSize;
      squares.push(t);
    }
    return squares;
  }

    let squares = [];
    let i = sw[1];

    while(i < ne[1]){
      let t = makeRow([sw[0], i], ne, subSectionSize);
      i += subSectionSize;
      squares = squares.concat(t);
    }

    return squares;
}
