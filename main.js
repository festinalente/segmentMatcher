/*Dependancies*/
const xml2js = require('xml2js').parseString,
      fs = require('fs-extra'),
      crypto = require('crypto');

/**
  * @function xml2JSON - Reads a GPX file and parses it into JSON.
  * @param {string} gpxFileName - The path to the file
  * @returns {Object} - The parsed file
  * @description - Calls xml2js.parseString() to parse a GPX file
  */

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

/**
  * @function testWithinBox - Find the smallest box containing a point.
  * @param {Object[]} testPt - An array containing two integers representing a point in 2D space.
  * @param {Object} node - A node to test whether a point is included.
  * @param {number} node.minX - A positive integer representing a lower bound on the x-axis.
  * @param {number} node.minY - A positive integer representing a lower bound on the y-axis.
  * @param {number} node.maxX - A positive integer representing an upper bound on the x-axis.
  * @param {number} node.minY - A positive integer representing an upper bound on the y-axis.
  * @returns {Boolean} - Boolean
  * @description A simple test to see if a point is contained a bounding box decribed by 2 points on a 2D plane.
  */

function testWithinBox(testPt, node){
  if(testPt[0] >= node.minX && testPt[0] <= node.maxX && testPt[1] >= node.minY && testPt[1] <= node.maxY){
    return true;
  }else{
    return false;
  }
}

/**
  * @function traverseRtree - Find the smallest box containing a point.
  * @param {Object[]} testPt - An array containing two integers representing a point in 2D space.
  * @param {Object} node - A node to test whether a point is included.
  * @param {number} node.minX - A positive integer representing a lower bound on the x-axis.
  * @param {number} node.minY - A positive integer representing a lower bound on the y-axis.
  * @param {number} node.maxX - A positive integer representing an upper bound on the x-axis.
  * @param {number} node.minY - A positive integer representing an upper bound on the y-axis.
  * @returns {Promise} - Promise object with either the leaf node containing the point
  * or undefined if no match is found.
  * @description This is a recursive function that drills down though my crude implementation
  * of an r-tree spatial index.
  */

function traverseRtree(testPt, node) {
  let promise = new Promise((resolve, reject) => {
    function dropThroughObject(node) {
      if (node && node.leaves && node.leaves.length > 0) {
        for (let j = 0; j < node.leaves.length; j++) {
          let branch = node.leaves[j];
          if (branch.branch && testWithinBox(testPt, branch)) {
            if (branch.branch === 1) {
              dropThroughObject(branch);
            } else {
              resolve(branch);
              break;
            }
          }
          /*If no further leaves are branches, then the resolve with root node
              of the current branch:*/
          if (j === node.leaves.length - 1) {
            resolve(node);
          }
        }
      } else {
        resolve(node);
      }
    }
    dropThroughObject(node);
  });
  return promise;
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
        // Flatterning https://en.wikipedia.org/wiki/Bessel_ellipsoid
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
           */
          x = parseInt(((N + h) * clat * Math.cos(rlng) + a)),
          y = parseInt(((N + h) * clat * Math.sin(rlng) + a)),
          z = parseInt(((N * (1 - e2) + h) * slat + a ));

      xyzPoints.push(x, y, z);

      if(i === parsedData.length-1){
        resolve(xyzPoints);
      }
    }
  });
  return promise;
}

/**
  * @function countLeaves - Counts leaves in a branch (i.e. excludes sub-branches)
  * @param {Object[]]} leaves - An array "leaves" belonging to a branch.
  */

function countLeaves(leaves){
  let count = 0;
  for (let i = 0; i < leaves.length; i++) {
    if(leaves[i].leaf === 1){
      count++;
    }
    if(i === leaves.length -1){
      return count;
    }
  }
}

/**
  * @function euclidianDist - Calculates the Euclidian distance between two points.
  * @param {Object[]} a - An array with point coordinates x, y: [x,y] to mesaure from.
  * @param {Object[]} b - An array with point coordinates x, y: [x,y] to mesaure to.
  * @description - There are many ways to resolve this problem, e.g. the Haversine
  * formula should in theory provide greater accuaracy.
  * @returns {number }The distance beween two points as an integer float.
  */

function euclidianDist(a, b){
  return Math.sqrt( Math.pow((a[0]-b[0]), 2) + Math.pow((a[1]-b[1]), 2) );
}

/**
  * @function setBounds - Updates the bounds of a branch depending on a set of ppints
  * @param {Object[]} point - An array with x,y point to update branch.
  * @returns {Object} branch - The updated branch object 
  */

function setBounds(point, branch){

  branch.maxX = (point[0] > branch.maxX) ? point[0] : (branch.maxX) ? branch.maxX : 0;
  //If an initialization object is passed with the value zero, update it:
  branch.minX = (point[0] < branch.minX || branch.minX === 0) ? point[0] : (branch.minX) ? branch.minX : 0;
  branch.maxY = (point[1] > branch.maxY) ? point[1] : (branch.maxY) ? branch.maxY : 0;
  branch.minY = (point[1] < branch.minY || branch.minY === 0) ? point[1] : (branch.minY) ? branch.minY : 0;

  return branch;
}

function setBoundsOnPoints(points){

  let lat = [];
  let lng = [];
  for (var i = 0; i < points.length; i++) {
    lat.push(points[i][0]);
    lng.push(points[i][0]);
    if(i === points.length-1){
      let latSort = lat.sort();
      let lngSort = lng.sort();

      let newBounds = {
        minX: latSort[0],
        minY: lngSort[0],
        maxX: latSort[latSort.length -1],
        maxY: lngSort[lngSort.length -1],
      };

      return newBounds;
    }
  }
};

function insertPoint(point, branch){
  let promise = new Promise((resolve, reject)=>{


    async function insert(point, branch){
      let correctbranch = await traverseRtree(point, branch);
      let newLeaf = makeLeaf(point);
          setBounds(point, branch);

      correctbranch.leaves.push(newLeaf);

      if(countLeaves(correctbranch.leaves) >= 9){
         let split = await splitBranch(correctbranch.leaves);
         let j = correctbranch.leaves.length -1;
          for (let i = j; i >= 0;  i--) {
            if(correctbranch.leaves[i] && correctbranch.leaves[i].leaf){
              correctbranch.leaves.splice(i,1);
            }
            if(i === j){
              correctbranch.leaves.push(split);
              //return branch for test
              //resolve(branch);
              resolve({branch: branch, segmentName: newLeaf.hash});
            }
          }
      }else{
        //return branch for test
        //resolve(branch);
        resolve({branch: branch, segmentName: newLeaf.hash});
      }
    }

    insert(point, branch);

  });
  return promise;
};

//Would normaly use heirarchical clustering
function splitBranch(leaves){
  //
  let promise = new Promise((resolve, reject)=>{
    let sortLat = [],
        lngMidPoinst = 0,
        sortLng = [],
        pointsXY = [];


    for (let i = 0; i < leaves.length; i++) {
      //skip branches, means split can occur with less leaves
      if(!leaves[i].startPtLat && !leaves[i].startPtLng){
        continue;
      }

      sortLat.push(leaves[i].startPtLat);
      sortLng.push(leaves[i].startPtLng);
      pointsXY.push([leaves[i].startPtLat, leaves[i].startPtLng]);

      if(i === leaves.length-1){
        //this sort catches NaNs and infinities:
        sortLat = sortLat.sort((a,b) => (+a || 0) - (+b || 0) || 0);

        //-1 is a 1 pt margin:
        let latZero = sortLat[0];
        let latMidPoint = Math.ceil((sortLat[4] + sortLat[5])  / 2);
        let latEndPoint = sortLat[sortLat.length-1];

        sortLng = sortLng.sort((a,b) => (+a || 0) - (+b || 0) || 0);

        let lngZero = sortLng[0];
        let lngMidPoint = Math.ceil((sortLng[4] + sortLng[5]) /2);
        let lngEndPoint = sortLng[sortLng.length-1];

        let branches = [];
        if(latEndPoint - latZero > lngEndPoint -lngZero){
          branches.push(makeChildBranch(latZero, lngZero, latMidPoint, lngEndPoint, leaves));
          branches.push(makeChildBranch(latMidPoint+1, lngZero, latEndPoint, lngEndPoint, leaves));
        }
        else {
          branches.push(makeChildBranch(latZero, lngZero, latEndPoint, lngMidPoint, leaves));
          branches.push(makeChildBranch(latZero, lngMidPoint+1, latEndPoint, lngEndPoint, leaves));
        }
        /*
        let branches = [
          makeChildBranch(latZero, lngZero, latMidPoint, lngMidPoint, pointsXY),
          makeChildBranch(latMidPoint, lngZero, latEndPoint, lngMidPoint, pointsXY),
          makeChildBranch(latZero, lngMidPoint, latMidPoint, lngEndPoint, pointsXY),
          makeChildBranch(latMidPoint, lngMidPoint, latEndPoint, lngEndPoint, pointsXY)
        ];
        */

        Promise.all(branches).then((settled)=>{
          let validBranches = settled.filter((branch)=>{if(branch !== null){return branch}});

          leaves = {
            "minX": latZero,
            "minY": lngZero,
            "maxX": latEndPoint,
            "maxY": lngEndPoint,
            "branch": 1,
            "leaves": validBranches
          };
          resolve(leaves);
        });
        //remove null
      }
    }

  });
  return promise;

}

/**
  * @function makeBranch - Creates an Object represnting a branch (area with points)
  * @param {number} minX - A positive integer representing a lower bound on the x-axis.
  * @param {number} minY - A positive integer representing a lower bound on the y-axis.
  * @param {number} maxX - A positive integer representing an upper bound on the x-axis.
  * @param {number} minY - A positive integer representing an upper bound on the y-axis.
  * @param {Object[]} points - An array of points to sort into the branch
  * @returns {Object} - Returns a branch object or null should there be no leaves
  * in the branch.
  */
function makeChildBranch(minX, minY, maxX, maxY, leaves){
  let promise = new Promise((resolve, reject)=>{

    let branch = {
      "minX": minX,
      "minY": minY,
      "maxX": maxX,
      "maxY": maxY,
      "branch": 1,
      "leaves": []
    };

    for (let i = 0; i < leaves.length; i++) {

      if(testWithinBox([leaves[i].startPtLat,leaves[i].startPtLng], {minX, minY, maxX, maxY})){
        //branch.leaves.push(makeLeaf(points[i]));
        branch.leaves.push(leaves[i]);
      }

      if(i === leaves.length-1){
        if(branch.leaves.length === 0){
          resolve(null);
        }else{
          resolve(branch);
        }
      }
    }
  });
  return promise;
}

/**
  * @function makeLeaf - Creates a leaf object
  * @param {Object[]} point - An array with two points.
  * @returns {Object} - Returns a leaf object with a unique hash.
  */
function makeLeaf(point){
  let leaf = {
    "startPtLat": point[0],
    "startPtLng": point[1],
    "leaf": 1,
    "hash": crypto.randomBytes(16).toString('hex')
  }
  return leaf;
}

/**
  * @function findSegments - Finds segments in a track.
  */
function findSegments(track){
  (async ()=>{
    let trackToXYpoints = await getLatLng(track);
    let rTree =  await fs.promises.readFile('segmentRTree.json', 'utf8');
    //traverse R-Tree to see if a match is found
    let segmentsFound = await comparePoints(trackToXYpoints, rTree);
    //Read the segments from file:
    //Doesn't return leaf!
    let lookUpSegments = await lookUpSegmentFn(segmentsFound);

    let segmentToXY = await getLatLng(lookUpSegments[0]);
    //find corresponding start and finish points
    //25m?
    //findStartFinishPts(trackToXYpoints, lookUpSegments[0], 90);
    //Run T-test
    findStartFinishByDistanceReduction(trackToXYpoints, segmentToXY, 200);

  })();

  function compare(a, b, accuracyInMeters){
    return (a - b < 0) ? (((a - b) * -1) <= accuracyInMeters) ? true : false :
        (a - b <= accuracyInMeters) ? true : false;
  }

  /**
    * @function trim - Trims points from the start or finish of an extarcted segment.
    * @param {Object[]} point - An array with two XY points to trim to.
    * @param {Object[]} extract - An array compare with the point provided.
    * @param {String} startOrFinish - A string "start" or "finish" depending what
    * requires trimming.
    */

  function trim(point, extract, startOrFinish){
    let promise = new Promise((resolve, reject)=>{
      let dist = [];
      let trimed;
      for (let i = 0; i < extract.length; i++) {
        let ptDist = euclidianDist(extract[i], point);
        dist.push(ptDist);

        if(i === extract.length-1){
          let closest = dist.indexOf(Math.min(...dist));
          if(startOrFinish === 'start'){
            trimed = extract.slice(closest);
            console.log(trimed.length);
          }
          if(startOrFinish === 'finish'){
            trimed = extract.slice(0, closest);
            console.log(trimed.length);
          }
          //console.log(trimed);
          resolve(trimed);
        }
      }
    });
    return promise;
  }


function pointsToXYZ(points){
  let ptsxyz =[];
  points.forEach((item, b) => {
    ptsxyz.push(item[0], item[1], null);
    if(b === points.length-1){
      console.log(JSON.stringify(ptsxyz));
    }
  });
}


  let distances = [];
  let extractXYZ = [];
  let extract = [];
  function findStartFinishByDistanceReduction(track, segment, accuracyInMeters){
    console.log(track[0]);
    console.log(segment[0]);
    for (let i = 0; i < track.length; i++) {
      for (let j = 0; j < segment.length; j++) {
        let dist = euclidianDist(track[i], segment[j]);
        if(dist < accuracyInMeters){
          if(!extract.includes(track[i])){
            extract.push(track[i]);
          }
        }
        if(i === track.length-1 && j === segment.length-1){
          console.log(extract.length);
          trim(segment[0], extract, 'start').then(
            (resultingArray)=>{
              trim(segment[segment.length-1], resultingArray, 'finish').then((res)=>{
                pointsToXYZ(res);
              });
            });
        }
      }
    }
  }



  function findStartFinishPts(track, segment, accuracyInMeters){

    let start = [segment[0], segment[1]];
    let end = [segment[segment.length-3], segment[segment.length-2]];
    let startPointInTrack = [];
    let endPointInTrack = [];
    let lat = [];
    let lng = [];

    for (let i = 0; i < track.length; i++) {
      //if(compare(track[i][0], start[0], accuracyInMeters) && compare(track[i][1], start[1], accuracyInMeters)){
      if(compare(track[i][0], start[0], accuracyInMeters) && compare(track[i][1], start[1], accuracyInMeters)){
        startPointInTrack.push(track[i]);
      }

      if(compare(track[i][0], end[0], accuracyInMeters) && compare(track[i][1], end[1], accuracyInMeters)){
        endPointInTrack.push(track[i]);
      }
      if(i === track.length-1){
        let segmentEquivalent = track.slice(startPointInTrack[0], endPointInTrack[0]);

        for (let i = 0; i < segmentEquivalent.length; i++) {
          lat.push(segmentEquivalent[i][0]);
          lng.push(segmentEquivalent[i][1]);
          if(i === segmentEquivalent.length-1){
            console.log(JSON.stringify(lat));
            console.log(JSON.stringify(lng));
          }
        }
      }


    }
  }

  function lookUpSegmentFn(segmentsFound){
    let promise = new Promise((resolve, reject)=>{
      (async ()=>{
        let segments = [];
        for (let i = 0; i < segmentsFound.length; i++) {
          /*TODO: Check if it always returns a branch, or if it also returns a leaf,
          if it always return a branch, write a little function to get the leaf*/
          let hash = segmentsFound[i].leaves[1].hash;
          let readSegment = await fs.promises.readFile(`./segments/${hash}.json`, 'utf8');
          //Read segments:
          const segmentJSON = await fs.promises.readFile('segmentRTree.json', 'utf8');
          //Parse xml:
          segments.push(JSON.parse(readSegment));
          if(segmentsFound[i].branch === 1){
            resolve(segments)
          }
        }
      })();
    });
    return promise;
  }

  function comparePoints(trackToXYpoints, rTree){
    let promise = new Promise((resolve, reject)=>{
      let compareAllPoints = [];
      for (var i = 0; i < trackToXYpoints.length; i++) {
        //traverseRtree as a race:
        compareAllPoints.push(traverseRtree(trackToXYpoints[i], rTree));

        if(i === trackToXYpoints.length-1){
          Promise.all(compareAllPoints).then((result)=>{
            let filtered = [];
            //I have a strong preference for for loops over array functions:
            for (let i = 0; i < result.length; i++) {
              if(filtered.indexOf(result[i]) === -1){
                filtered.push(JSON.parse(result[i]));
              }
              if(i === result.length-1){
                resolve(filtered);
              }
            }

          });
        }
      }
    });
    return promise;
  }


  /*
      lat = await getXYZ('lat', segment);
      lng = await getXYZ('lng', segment);
  let altered = await alterbyX(lat, lng);
      altLat = altered[0]
      altLng = altered[1];
  let latT = await tTest(lat, false, altLat, false),
      lngT = await tTest(lng, false, altLng, false),
      latCertainty = 100 - Math.abs((latT) * 100),
      lngCertainty = 100 - Math.abs((lngT) * 100);

  if(latCertainty >= 99 && lngCertainty >= 99){
    document.querySelector('#fitData').textContent =
      `Latitude values match with ${latCertainty}% certainty,
       fuzzy latitude data has length: ${altLat.length} against ${lat.length}.
       Longitude values match with ${lngCertainty}% certainty,
       fuzzy longitude data has length: ${altLng.length} against ${lng.length}`;
    chart(lat, lng, altLat, altLng);
  }else{
    let it = document.querySelector('#iterations').textContent;
    document.querySelector('#iterations').textContent = `${parseInt(it) + 1}`;
    fire();
  }*/
}


function getLatLng(segment){
  let promise = new Promise((resolve, reject)=>{
    let returnValues = [];
    for (let i = 0; i < segment.length; i++) {
      segment[i]
      if(i === 0){
        returnValues.push([segment[i], segment[i+1]]);
      }
      else if(i > 0 && i % 3 === 0){
        returnValues.push([segment[i], segment[i+1]]);
      }
      if(i === segment.length-1){
        resolve(returnValues);
      }
    }
  });
  return promise;
}

function getXYZ(xyz, segment){
  let promise = new Promise((resolve, reject)=>{
    xyz = (xyz === 'lat') ? 0 : (xyz === 'lng') ? 1 : (xyz === 'ele') ? 2 : null;
    let returnVal = [];
    for(let i = xyz; i < segment.length; i++){
       if(i === xyz){
         returnVal.push(segment[i]);
       }
      else if( i > xyz && (i - xyz) % 3 === 0){
         returnVal.push(segment[i])
       };
       if(i  === segment.length -1){
         resolve(returnVal);
       };
    }
  });
  return promise;
}


function processFile(gpx, processSegment){
  let promise = new Promise((resolve, reject)=>{
    //Self instantiating:
    (async ()=>{
      try {
        //Read segments index into memory:
        const segmentJSON = await fs.promises.readFile('segmentRTree.json', 'utf8');
        //Parse segment data:
        const branch = JSON.parse(segmentJSON);
        //Parse xml:
        const jsonData = await xml2JSON(gpx);
        //Get xyz coordinate data:
        const toCoordinates = await toXyz(jsonData.gpx.trk[0].trkseg[0].trkpt);
        //This option was added as a way to add segments to test against:
        if(processSegment){
          //let write = await writeSegmentData(toCoordinates);
          //Insert segement start point into R-tree
          let insertSegment = await insertPoint([toCoordinates[0],toCoordinates[1]], branch);
          //Save segment, first the start point in the R-tree
          let writeRTree = await fs.promises.writeFile(`segmentRTree.json`, JSON.stringify(insertSegment.branch));
          //Then the segment file itself with the hash in the segment summary matching filename.
          /*TOD0: Make file structure mirror R-Tree*/
          let writeSegment = await fs.promises.writeFile(`./segments/${insertSegment.segmentName}.json`, JSON.stringify(toCoordinates));
          resolve();
        }
        else {
          let segments = await findSegments(toCoordinates);
          resolve();
        }
      } catch (err) {
        if (err) throw err;
      };
    })();
  });
  return promise;
}

module.exports = {processFile, traverseRtree, testWithinBox, makeChildBranch, splitBranch, insertPoint, findSegments};
