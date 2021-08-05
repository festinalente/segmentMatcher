const processedSegmentsStartFinish = [];
const processedSegmentsHashes = [];
const segmentSummaries = {};
/**
 * In a production environment, I would store segment refrence
 * points would be stored in an kd-tree or similar datastructure
 * in a database designthat supports it (e.g. PostGIS).
 * Choice of which data structure/index to store segements, and/or
 * whether to store segements directly in
 * For this example the segments dumped in a folder as .json
 */

 const segmentTree = []




function writeSegmentData(segment){
  let promise = new Promise((resolve, reject)=>{
    let l = segment.length;
    //This doesn't check for collisions (unlikely):
    let id = crypto.randomBytes(16).toString('hex');
    processedSegmentsStartFinish.push(segment[0]);
    processedSegmentsStartFinish.push(segment[1]);
    processedSegmentsStartFinish.push(segment[l - 3]);
    processedSegmentsStartFinish.push(segment[l - 2]);
    processedSegmentsHashes.push(id);


    //Append the new segment summary:
    /*{
      "startFinishPts":[],
      "hashes":[]
    }*/
    fs.readFile('segmentSummaries.json', 'utf8', function (err, data) {
      if (err) throw err;
      let d = JSON.parse(data);
          d.startFinishPts.push(processedSegmentsStartFinish);
          d.hashes.push(processedSegmentsHashes);
      fs.writeFile(`./segmentSummaries.json`, JSON.stringify(d));
    });
  });
  return promise;
}


module.exports = (gpxFile, folder)=>{
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
      return ;
    }
  }
  /**
   * @description
   * If this were for production I would probably just use a database that
   * implements spatial data structures (e.g. R-tree) and query/write to it
   * directly using open source tools such as those mentioned/developed by
   * Vladimir Agafonkin:
   *
   * https://blog.mapbox.com/a-dive-into-spatial-search-algorithms-ebd0c5e39d2a
   *
   * Typical accuracy from decimal points (at equator) is 1.11m for 5 decimals
   * points used in strava segments.
   *
   * Other considerations are segment data being of unequal length (e.g. due
   * sampling rate on a particular device), hence it's not sufficient to simply
   * match points, rather match "likeness".
   */
  function matchSegments(points){
    //remove altitude
    /*
    store values a lat, lng, hash
    [lat, lng];
    [lat, lng];
    [hash];
    loop through first points,
      break;
    then
    loop through last points (starting at index of the first point!)
    then
      break;
    */

    for (var i = 0; i < startPoints.length; i++) {
      startPoints[i]
    }
    points.pop();
    fs.readFile('segmentSummaries.json', 'utf8', function (err, data) {
      if (err) throw err;
      let segments = JSON.parse(data);
      //remember point are accurate to mm! 10
      segments.forEach((seg, i) => {
        const foundLat = points.find(el => el > seg.startLat - (20 * 100) && el < seg.startLat + (20 * 100))

        if(foundLat){
          let next = points[points.indexOf(foundLat)+ 1];
          const foundLng = (next > seg.startLng - 10 && next < seg.startLng + 10) ? next : false;
          if(foundLat && foundLng){
            console.log(`Found a segment starting at: ${foundLat}, ${foundLng}`);
          }

        }
      });

    });
  }

  /*This is a template object used to add segment summaries, it is not relevant
  to searches.*/
  let sampleSegment = {
     "id":"3a4800b502ebc3e773045c94951c1e8f",
     "startLat":1141253135,
     "startLng":5627273514,
     "accent":0,
     "descent":0,
     "length":0
  }

  /**
   * @function toXyz Converts to ECFC then translates the origin.
   * @param {Object[]} parsedData Takes an array of track points.
   * @returns {Object[]} An array of continuous x,y,z points in positive space.
   * @description This function finds the position in XYZ relative to ECEF
   * https://en.wikipedia.org/wiki/ECEF (earth center) then translates this so
   * as to always return values in positive 3D space.
   *
   * Inspired by https://github.com/substack/geodetic-to-ecef
   *
   * A question remained in my mind whether using using the entire planet as
   * frame of reference was required (desirable?) as opposed to using a flat
   * frame of reference bounding the route file. This depends mostly on
   * how it will be used and what level of accuracy required.
   */
  function toXyz(parsedData){
    const xyzPoints = [],
          // equitorial radius (semi-major axis)
          a = 6378137,
          f = 1/298.257223563,
          // first eccentricity squared
          e2 = (2 - f) * f;
    let promise = new Promise((resolve, reject)=>{
      for (let i = 0; i < parsedData.length; i++) {

        let lat = parseFloat(parsedData[i]['$'].lat),
            lng = parseFloat(parsedData[i]['$'].lon),
            ele = (parsedData[i].ele && parsedData[i].ele[0]) ? parseFloat(parsedData[i].ele[0]) : 0,
            h = ele === undefined ? 0 : ele;
            let rlat = lat / 180 * Math.PI,
            rlng = lng / 180 * Math.PI,

            slat = Math.sin(rlat),
            clat = Math.cos(rlat),
            N = a / Math.sqrt(1 - e2 * slat * slat),

            /**
             * Adding "a" (planet radius) moving the points uniformly relative
             * to the origin so that they are always in positive 3D space.
             * Values are converted to millimeters and and saved as Int rather
             * a than float to save storage space.
             */
            x = parseInt(((N + h) * clat * Math.cos(rlng) + a)),
            y = parseInt(((N + h) * clat * Math.sin(rlng) + a)),
            z = parseInt(((N * (1 - e2) + h) * slat + a ));
            console.warn("changed from mmm to m");
        xyzPoints.push(x, y, z);

        if(i === parsedData.length-1){
          resolve(xyzPoints);
        }
      }
    });
    return promise;
  }

  async function processFile(gpx){
    let promise = new Promise((resolve, reject)=>{
      try {
        //Parse xml:
        const jsonData = await xml2JSON(gpx);
        //Get xyz coordinate data:
        const toCoordinates = await toXyz(jsonData.gpx.trk[0].trkseg[0].trkpt);
        //This option was added as a way to add segments to test against:
        if(processSegment){
          let write = await writeSegmentData(toCoordinates);
          resolve();
        }
        else{
          let segments = await matchSegments(toCoordinates);
          resolve();
          //fs.writeFile(`./processedFiles/${id}.json`, JSON.stringify(toCoordinates));
        }
      } catch (e) {

      } finally {

      }
    });
    return promise;

  }

  if(folder){
    fs.readdir('segmentsFromStravaGPX').then((files)=>{

    }
  }
  else{
   processFile(gpxFile);
  }



}
