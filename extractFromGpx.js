module.exports = (gpxFile, processSegment)=>{
  const xml2js = require('xml2js').parseString,
        fs = require('fs-extra'),
        //haversine = require('./haversine'),
        crypto = require('crypto');

  function xml2JSON(gpxFileName){
    let promise = new Promise((resolve, reject)=>{
      fs.readFile(gpxFileName, (err, data)=>{
        if (err){
          reject(err);
        }
        let parsedFile = xml2js(data, (err, result)=>{
          if (err){
            reject(err);
          }
          resolve(result);
        });
      });
    });
    return promise;
  }

  /*
  Given typical margin of error with GPS the first point of a segment is
  matched to with 20 m using the haversine formula. The first point of a
  segment is extracted, if there is a match, the rest of the segment
  is processed.

  The file structure for this would be stored in a file system adopting the
  "HGT" naming convention e.g. N36W007 where by the name represents the origin
  of a "square" 1 degree latitude by 1 degree longitude, or fractions thereof,
  thus reducing lookup time.

  Segment start point and characteristics could be stored separately to speed up
  look ups. In this mock up I am using "segmentSummaries.json" in the root dir.
  */


  function distanceBetweenPoints(a, b){
    let calc = (a[0] - b[0]) + (a[1] - b[1]);
    let preventNegative = ( calc < 0) ? calc * -1 : calc;
    let d = Math.sqrt(preventNegative);
    if( d < 20){
      console.log('HIT');
    }

  }

  function matchSegments(points){

    fs.readFile('segmentSummaries.json', 'utf8', function (err, data) {
      if (err) throw err;
      let segments = JSON.parse(data);

    });
  }

  /**
    //inspired by https://github.com/substack/geodetic-to-ecef
    converts to ECFC then translates the origin.
    * @description This function finds the position in XYZ relative to ECEF
    * (earth center) then translates this so as to always return values in
    * positive 3D space. Inspired by https://github.com/substack/geodetic-to-ecef
  **/

  function toXyz(parsedData){
    const xyzPoints = [],
          a = 6378137, // equitorial radius (semi-major axis)
          f = 1/298.257223563,
          e2 = (2 - f) * f; // first eccentricity squared
    let promise = new Promise((resolve, reject)=>{
      for (let i = 0; i < parsedData.length; i++) {

        let lat = parseFloat(parsedData[i]['$'].lat),
            lng = parseFloat(parsedData[i]['$'].lon),
            ele = parseFloat(parsedData[i].ele[0]),

            h = ele === undefined ? 0 : ele,
            rlat = lat / 180 * Math.PI,
            rlng = lng / 180 * Math.PI,

            slat = Math.sin(rlat),
            clat = Math.cos(rlat),
            N = a / Math.sqrt(1 - e2 * slat * slat),

            /*
            Adding "a" (planet radius) moving the points uniformly relative to
            the origin so that they are always in positive 3D space.
            */
            x = (N + h) * clat * Math.cos(rlng) + a,
            y = (N + h) * clat * Math.sin(rlng) + a,
            z = (N * (1 - e2) + h) * slat + a;

        xyzPoints.push(x, y, z);

        if(processSegment && i === 0){
          sampleSegment.startLat = x;
          sampleSegment.startLng = y;
        }

        if(i === parsedData.length-1){
          resolve(xyzPoints);
        }
      }
    });
    return promise;
  }

  (async ()=>{
    try {
      const jsonData = await xml2JSON(gpxFile),
            toCoordinates = await toXyz(jsonData.gpx.trk[0].trkseg[0].trkpt),
            segments = await matchSegments(toCoordinates);
      //Doesn't check for collisions:
      let id = crypto.randomBytes(16).toString('hex');
      //this option was added as a way to add segments:
      if(processSegment){
        sampleSegment.id = id;
        fs.writeFile(`./segments/${id}.json`, JSON.stringify(toCoordinates));

        fs.readFile('segmentSummaries.json', 'utf8', function (err, data) {
          if (err) throw err;
          let segments = JSON.parse(data);
              segments.push(toCoordinates);

          fs.writeFile(`./segmentSummaries.json`, JSON.stringify(segments));

        });

      }else{
        fs.writeFile(`./processedFiles/${id}.json`, JSON.stringify(toCoordinates));
      }
    } catch (e) {

    } finally {

    }

  })();

}
