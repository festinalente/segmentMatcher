/*Third party dependancies -not required*/
//const xml2js = require('xml2js').parseString;
/**
	* This is a C++ module I cobbled together because it was taking xml2js 0.8 s to
	* parse a 5.1 MB file. Note, I have *very* little experience with C++ and only
	* started learning it recently, litteraly for couple of days.
	*/
const cpp_xml2json = require('./cppModules/cpp_xml2json/build/Release/cpp_xml2json.node').XML2JSON;
const fs = require('fs-extra');
const crypto = require('crypto');

/**
	* @function xml2JSON - Reads a GPX file and parses it into JSON.
	* @param {string} gpxFileName - The path to the file
	* @returns {Object} - The parsed file
	* @description - Calls xml2js.parseString() to parse a GPX file
	* @performance - Mean 0.8257652517999976s for 10 iterations on a 5.1 MB file.
	*/

function xml2JSON(gpxFileName){
	let promise = new Promise((resolve, reject)=>{
		fs.readFile(gpxFileName, (err, data)=>{
			if (err){
				reject(err);
			}
			(data, (err, result)=>{
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
				 * I haven't looked into the trigonometry.
				 */
				x = parseInt(((N + h) * clat * Math.cos(rlng)) + a),
				y = parseInt(((N + h) * clat * Math.sin(rlng)) + a),
				z = parseInt(((N * (1 - e2) + h) * slat) + a);

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
	* @retruns {number} - The number leaves (excluding sub-branches) at the top level
	* of a branch.
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
	* @returns {number }The distance beween two points as an integer float.
	* @description - There are many ways to resolve this problem, e.g. the Haversine
	* formula should in theory provide greater accuaracy.
	*/

function euclidianDist(a, b){
	simpleTypeCheck(a, 'array');
	simpleTypeCheck(b, 'array');
	return Math.sqrt( Math.pow((a[0]-b[0]), 2) + Math.pow((a[1]-b[1]), 2) );
}

/**
	* @function setBounds - Updates the bounds of a branch depending on a single points
	* @param {Object[]} point - An array with x,y point to update branch.
	* @returns {Object} branch - The updated branch object.
	*/

function setBounds(point, branch){
	branch.maxX = (point[0] > branch.maxX) ? point[0] : (branch.maxX) ? branch.maxX : 0;
	//If an initialization object is passed with the value zero, update it:
	branch.minX = (point[0] < branch.minX || branch.minX === 0) ? point[0] : (branch.minX) ? branch.minX : 0;
	branch.maxY = (point[1] > branch.maxY) ? point[1] : (branch.maxY) ? branch.maxY : 0;
	branch.minY = (point[1] < branch.minY || branch.minY === 0) ? point[1] : (branch.minY) ? branch.minY : 0;

	return branch;
}

/**
	* @function insertPoint - Inserts a point into a branch of the R-tree.
	* @param {Object[]} point - An array with the XY coordinates of a point to be
	* inserted into the R-tree corresponding to the start point of a segment.
	* @param {Object} branch - The branch to insert the point (typically this branch
	* is the entire tree).
	* @description Inserts a point into a branch of the R-tree at the
	* furthest point, splits the branch if there are more than 9 leaves or sub-branches
	* in that brach.
	*/
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
						resolve({branch: branch, segmentName: newLeaf.hash});
					}
				}
			}else{

				resolve({branch: branch, segmentName: newLeaf.hash});
			}
		}

		insert(point, branch);

	});
	return promise;
}

/**
	* @function splitBranch - Crudely splits a branch into two
	* @param {Object[]} leaves - An array of leaves on a branch.
	* @returns {Object} - Return the leaves split into new branches.
	* @description - This is a rather crude way to resolve this, another way would
	* be to use heirarchical clustering, which although prettier I'm not sure
	* is better.
	*/

function splitBranch(leaves){

	let promise = new Promise((resolve, reject)=>{
		let sortLat = [],
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

				Promise.all(branches).then((settled)=>{
					let validBranches = settled.filter((branch)=>{if(branch !== null){return branch;}});

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
	* @function trim - Trims points from the start or finish of an extarcted segment.
	* @param {Object[]} point - An array with two XY points to trim to.
	* @param {Object[]} extract - An array compare with the point provided.
	* @param {String} startOrFinish - A string "start" or "finish" depending what
	* requires trimming.
	* @returns {Promise} - Returns a promise with the extracted points trimmed either
	* to the start or finish of a segment.
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
				}
				if(startOrFinish === 'finish'){
					trimed = extract.slice(0, closest);
				}
				resolve(trimed);
			}
		}
	});
	return promise;
}

/**
	* @function pointsToXYZ - Convert points XY points to XYZ (adds a null)
	* @param {Object[]} - Array of arrays of points [[x,y], [x,y]]
	* @returns {Object[]} - Array with continuous xyz points [x,y,z,x,y,z...]
	* @description - Internal to this script to help visualize points.
	*/

function pointsToXYZ(points){
	let promise = new Promise((resolve, reject)=>{
		let ptsxyz =[];
		points.forEach((item, b) => {
			ptsxyz.push(item[0], item[1], null);
			if(b === points.length-1){
				resolve(ptsxyz);
			}
		});
	});
	return promise;
}

/**
	* @function distanceToALine - Quick and dirty copy of a function to resolve for distance
	* @param {Object[]} lineStart - Array with two point [x,y]
	* @param {Object[]} lineEnd - Array with two point [x,y]
	* @param {Object[]} pointCompare - Array with two point [x,y]
	* @description To resolve issues with segement where they lacked points on straight
	* lines
	*/

function distanceToALine(lineStart, lineEnd, pointCompare){
	//https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment
	let A = pointCompare[0] - lineStart[0],
		B = pointCompare[1] - lineStart[1],
		C = lineEnd[0] - lineStart[0],
		D = lineEnd[1] - lineStart[1];

	let dot = A * C + B * D;
	let len_sq = C * C + D * D;
	let param = -1;
	if (len_sq != 0) //in case of 0 length line
		param = dot / len_sq;

	let xx, yy;

	if (param < 0) {
		xx = lineStart[0];
		yy = lineStart[1];
	}
	else if (param > 1) {
		xx = lineEnd[0];
		yy = lineEnd[1];
	}
	else {
		xx = lineStart[0] + param * C;
		yy = lineStart[1] + param * D;
	}

	let dx = pointCompare[0] - xx;
	let dy = pointCompare[1] - yy;
	return Math.sqrt(dx * dx + dy * dy);
}

/**
	* @function extractSegement - Extract the points equivalent to a segment from a track.
	* @param {Object[]} - An array of points corresponding to a track.
	* @param {Object[]} - An array of points corresponding to a segemnt.
	* @param {number} - An integer corresponding to the accuracy in meters.
	* @description - The initial extract can be quite inacurate (e.g. using a large)
	* number for accuracy, the trimming function then corrects this. Good numbers
	* tend to be in the range of 10-15.
	*/

function extractSegement(track, segment, accuracyInMeters){
	let promise = new Promise((resolve, reject)=>{
		let extract = [];

		for (let i = 0; i < track.length; i++) {
			for (let j = 0; j < segment.length; j++) {
				//Are the points close?
				let dist = euclidianDist(track[i], segment[j]);
				//If not, are we close to a line between two points?
				let distanceToTheLine = 0;

				if(i > 1){
					distanceToTheLine = distanceToALine(track[i-1], track[i], segment[j]);
				}

				if(dist < accuracyInMeters || distanceToTheLine < accuracyInMeters){
					//avoid duplicates:
					if(!extract.includes(track[i])){
						extract.push(track[i]);
					}
				}
				if(i === track.length-1 && j === segment.length-1){

					trim(segment[0], extract, 'start').then(
						(resultingArray)=>{
							trim(segment[segment.length-1], resultingArray, 'finish').then(
								(res)=>{

									if(res.length === 0){
										resolve(null);
									}
									else{
										pointsToXYZ(res).then((xy)=>{
											resolve(xy);
										});
									}
								});
						}
					);
				}
			}
		}
	});
	return promise;
}

/**
	* @function simpleTypeCheck
	* @description - A simple type checking function for my own use. It checks
	* for the type of number not just number (int or float), distinguishes between
	* Array and Object.
	*/
function simpleTypeCheck(val, requiredType){
	let type = (typeof val === 'object') ?
		(Array.isArray(val) === true) ? 'array' : 'object' :
		(typeof val === 'number') ?
			(val % 1 === 0) ? 'integer' : 'float' :
			typeof val;

	if(type !== requiredType){
		let e = new Error(`Incorrect type ${type}, ${requiredType} required.`);
		throw e;
	}
	else{
		return true;
	}
}



function checkDistanceToSegementStart(segmentLeaves, point, accuracy){
	simpleTypeCheck(segmentLeaves, 'object');
	simpleTypeCheck(point, 'array');
	simpleTypeCheck(accuracy, 'integer');

	let validLeaves = [];
	let leaves = segmentLeaves.leaves;

	let promise = new Promise((resolve, reject)=>{
		for (let i = 0; i < leaves.length; i++) {
			let dist = euclidianDist(point, [leaves[i].startPtLat, leaves[i].startPtLng]);
			if(dist < accuracy){
				validLeaves.push(leaves[i]);
			}
			if(i === leaves.length-1){
				if(validLeaves.length > 0){
					resolve(validLeaves);
				}
				else{
					resolve(null);
				}
			}
		}
	});
	return promise;
}

/**
	* Compare Points
	* @namespace ComparePoints

/**
	*
	* @function comparePoints - Finds corresponding branch in R-tree.
	* @memberof ComparePoints
	* @param {number[][]} trackToXYpoints - An a array of array representing x,y points: [[x,y], [x,y]].
	* @param {Object} rTree - A branch or entire R-tree to query.
	* @description
	*/

function comparePoints(trackToXYpoints, rTree, accuracy){
	simpleTypeCheck(trackToXYpoints, 'array');
	simpleTypeCheck(rTree, 'object');
	simpleTypeCheck(accuracy, 'integer');

	let promise = new Promise((resolve, reject)=>{
		let potentialSegments = [];

		(async ()=>{
			let i = 0;
			while(i < trackToXYpoints.length){
				let segmentLeaves = await traverseRtree(trackToXYpoints[i], rTree);
				let validLeaves = await checkDistanceToSegementStart(segmentLeaves, trackToXYpoints[i], accuracy);
				let check = await checkDups(validLeaves, potentialSegments);
				potentialSegments = check;
				i++;
			}

			resolve(potentialSegments);
		})();
	});
	return promise;

}

/**
	* @function checkDups
	* @memberof comparePoints
	* @description - Ugly solution to the problem.
	*/

function checkDups(validLeaves, potentialSegments){
	let promise = new Promise((resolve, reject)=>{
		if(!validLeaves){
			resolve(potentialSegments);
		}
		validLeaves.forEach((leaf, j) => {
			if(!potentialSegments.some(segment => segment.hash === leaf.hash)){
				potentialSegments.push(leaf);
			}
			if(j === validLeaves.length-1){
				resolve(potentialSegments);
			}
		});
	});
	return promise;
}

/**
	* @function getLatLng - Gets latitude and logitude points (or x, y) from [x,y,z...]
	* @param {number[]} segment - An array of [x, y, z...] numbers
	* @returns {number[][]} - An array of arrays containing x, y points [[x,y], [x,y]]
	*/

function getLatLng(segment){
	let promise = new Promise((resolve, reject)=>{
		let returnValues = [];
		for (let i = 0; i < segment.length; i++) {
			segment[i];
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

/**
	* @function lookUpSegments - Simply opens segment files and parses
	* @param {Object[]} segmentsFound - An array with leaf objects corresponding
	* to segment files to open.
	*/

function lookUpSegmentFn(segmentsFound){
	let promise = new Promise((resolve, reject)=>{
		let segments = [];
		(async ()=>{

			for (let i = 0; i < segmentsFound.length; i++) {
				let hash = segmentsFound[i].hash;
				let readSegment = await fs.promises.readFile(`./segments/${hash}.json`, 'utf8');
				segments.push(JSON.parse(readSegment));

				if(i === segmentsFound.length-1){
					resolve(segments);
				}
			}

		})();
	});
	return promise;
}

/**
	* @function processAllInFolder
	* @description - A function for my own use building a mockup to call processFile()
	* on every segment in a folder.
	*/

async function processAllInFolder(){
	let seedIfNeeded = await seedRtree();
	let files = await fs.promises.readdir('./segmentsFromStravaGPX');

	let i = 0;
	while(i <files.length){
		let current =  await processFile(`./segmentsFromStravaGPX/${files[i]}`, true);
		i++;
	}
}

/**
	* @function seedRtree - Seeds an R-Tree if one doesn't exit.
	* @description Used mainly for my own use while testing.
	*/

function seedRtree(){
	let promise = new Promise((resolve, reject)=>{
		(async ()=>{
			const rTree = await fs.promises.readFile('segmentRTree.json', 'utf8');
			const seed = {"minX": 0,"minY": 0,"maxX": 0,"maxY": 0,"branch": 1,"leaves": []};
			if(rTree.length === 0){
				let writeRTree = await fs.promises.writeFile(`segmentRTree.json`, JSON.stringify(seed));
				resolve();
			}else{
				//already seeded:
				resolve();
			}
		})();
	});
	return promise;
}

/**
	* @function processFile
	* @param {string} GPX - A path to a GPX file either an entire route or a segment.
	* @param {boolean} processSegment - An option on whether to process and store
	*  the file as segment.
	* @param {number} accuracy - An integer (1 ~ 10cm awkwardly).
	*/


//Read segments index into memory:
const rTree = fs.readFileSync('segmentRTree.json', 'utf8');
//Parse segment data:
const branch = JSON.parse(rTree);


function processFile(gpx, processSegment, accuracy){
	accuracy = (accuracy) ? accuracy : 200;

	let promise = new Promise((resolve, reject)=>{
		//Self instantiating:
		(async ()=>{
			try {

				/**
				 * Parse xml:
				 * This ended up being a slight bottle neck so I used a C++ add on
				 * of my own making (aside the parser) to speed it up. I did this for
				 * fun, I'm completely new to C++, so you might see some ignorant mistakes.
				 * The JavaScript code to do the same thing:

					 //Parse XML
					 const jsonData = await xml2JSON(gpx);
					 //Get xyz coordinate data:
					 const toCoordinates = await toXyz(jsonData.gpx.trk[0].trkseg[0].trkpt);

					 See README.MD

				 */

				const toCoordinates = JSON.parse(cpp_xml2json(gpx));
				//This option was added as a way to add segments to test against:
				if(processSegment){
					//Insert segement start point into R-tree
					let insertSegment = await insertPoint([toCoordinates[0],toCoordinates[1]], branch);
					//Save segment, first the start point in the R-tree
					await fs.promises.writeFile('segmentRTree.json', JSON.stringify(insertSegment.branch));
					//Then the segment file itself with the hash in the segment summary matching filename.
					/*TOD0: Make file structure mirror R-Tree*/
					await fs.promises.writeFile(`./segments/${insertSegment.segmentName}.json`, JSON.stringify(toCoordinates));
					resolve();
				}
				else {
					//Better ported to C++ also
					let trackToXYpoints = await getLatLng(toCoordinates);
					//Gets all segment that might be on route:
					let segmentsFound = await comparePoints(trackToXYpoints, branch, accuracy);

					if(segmentsFound.length === 0){
						resolve({originalFileInXYZ: toCoordinates, message: 'No segments found on this track'});
					}
					//Gets the segment files, takes a while.
					let lookUpSegments = await lookUpSegmentFn(segmentsFound);

					let i = 0;
					let extractedSegments = [];

					while(i < lookUpSegments.length){
						let segmentToXY = await getLatLng(lookUpSegments[i]);
						/*This might be a surperfluous step as it extracts the segment
						 equivalent points from the track, it would be quicker to just
						 return the segment as a match.*/
						let extracted = await extractSegement(trackToXYpoints, segmentToXY, accuracy);
						if(extracted){
							extractedSegments.push(extracted);
						}
						i++;
					}

					resolve({
						originalFileInXYZ: toCoordinates,
						extractedSegments : extractedSegments,
						originalSegments: lookUpSegments});
				}
			} catch (err) {
				if (err) throw err;
			}
		})();
	});
	return promise;
}

module.exports = {processFile, traverseRtree, testWithinBox, makeChildBranch, splitBranch, insertPoint, processAllInFolder, xml2JSON};
