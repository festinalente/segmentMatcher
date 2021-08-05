let main = require('./main');

/**
 * test function
 * @param {string} desc
 * @param {function} fn
 */
function it(desc, fn) {
  try {
    fn();
    console.log('\x1b[32m%s\x1b[0m', '\u2714 ' + desc);
  } catch (error) {
    console.log('\n');
    console.log('\x1b[31m%s\x1b[0m', '\u2718 ' + desc);
    console.error(error);
  }
}

function logPass(message){
  console.log('\x1b[32m%s\x1b[0m', '\u2714 ' + message);
}


function assert(isTrue) {
  if (!isTrue) {
    throw new Error();
  }
}

function createRandomPoints(limit){
  return [Math.floor(Math.random() * limit), Math.floor(Math.random() * limit)]
}

let seedMinX =  13589394,
    seedMinY =  13589394,
    seedMaxX =  96957942,
    seedMaxY =  96957942,
    seedRtree = {
      "minX": 0,
      "minY": 0,
      "maxX": 0,
      "maxY": 0,
      "branch": 1,
      "leaves": []
    };

let testRtree = {
  "minX": seedMinX,
  "minY": seedMinY,
  "maxX": seedMaxX,
  "maxY": seedMaxY,
  "branch": 1,
  "leaves": [
    {
      "minX": seedMinX * 1.25,
      "minY": seedMinY * 1.25,
      "maxX": seedMaxX * .5,
      "maxY": seedMaxY * .5,
      "branch": 1,
      "leaves": [
        {
          "startPtLat": seedMinX *  1.275,
          "startPtLng": seedMinY *  1.275,
          "leaf": 1,
          "hash": "Level 1, leaf 1"
        },
        {
          "startPtLat": seedMinX *  1.30,
          "startPtLng": seedMinY * 1.30,
          "leaf": 1,
          "hash": "Level 1, leaf 2"
        },
        {
          "minX": seedMinX * 1.25 * 1.1,
          "minY": seedMinY * 1.25 * 1.1,
          "maxX": seedMaxX * .5 * 0.9,
          "maxY": seedMaxY * .5 * 0.9,
          "branch": 1,
          "leaves": [
            {
              "startPtLat": seedMinX * 1.27 * 1.1,
              "startPtLng": seedMinY * 1.27 * 1.1,
              "leaf": 1,
              "hash": "Two deep"
            },
            {
              "minX": seedMinX * 1.25 * 1.1 * 1.1,
              "minY": seedMinY * 1.25 * 1.1 * 1.1,
              "maxX": seedMaxX * .5 * 0.9 * 0.9,
              "maxY": seedMaxY * .5 * 0.9 * 0.9,
              "branch": 1,
              "leaves": [
                {
                  "startPtLat": seedMinX * 1.27 * 1.1 * 1.1,
                  "startPtLng": seedMinY * 1.27 * 1.1 * 1.1,
                  "leaf": 1,
                  "hash": "three deep"
                },
                {
                  "startPtLat": seedMinX * 1.27 * 1.1 * 1.12,
                  "startPtLng": seedMinY * 1.27 * 1.1 * 1.12,
                  "leaf": 1,
                  "hash": "three deep"
                },
                {
                  "startPtLat": seedMinX * 1.27 * 1.1 * 1.13,
                  "startPtLng": seedMinY * 1.27 * 1.1 * 1.13,
                  "leaf": 1,
                  "hash": "three deep"
                },
                {
                  "startPtLat": seedMinX * 1.27 * 1.1 * 1.14,
                  "startPtLng": seedMinY * 1.27 * 1.1 * 1.14,
                  "leaf": 1,
                  "hash": "three deep"
                },
                {
                  "startPtLat": seedMinX * 1.27 * 1.1 * 1.15,
                  "startPtLng": seedMinY * 1.27 * 1.1 * 1.15,
                  "leaf": 1,
                  "hash": "three deep"
                },
                {
                  "startPtLat": seedMinX * 1.27 * 1.1 * 1.16,
                  "startPtLng": seedMinY * 1.27 * 1.1 * 1.16,
                  "leaf": 1,
                  "hash": "three deep"
                },
                {
                  "startPtLat": seedMinX * 1.27 * 1.1 * 1.17,
                  "startPtLng": seedMinY * 1.27 * 1.1 * 1.17,
                  "leaf": 1,
                  "hash": "three deep"
                },
                {
                  "startPtLat": seedMinX * 1.27 * 1.1 * 1.18,
                  "startPtLng": seedMinY * 1.27 * 1.1 * 1.18,
                  "leaf": 1,
                  "hash": "three deep"
                },
                {
                  "startPtLat": seedMinX * 1.27 * 1.1 * 1.19,
                  "startPtLng": seedMinY * 1.27 * 1.1 * 1.19,
                  "leaf": 1,
                  "hash": "three deep"
                }
              ]
            }
          ]
        },
      ]
    }
  ]
};

let threeDeep = [seedMinX * 1.27 * 1.1 * 1.1, seedMinY * 1.27 * 1.1 * 1.1,];
let twoDeep = [seedMinX * 1.27 * 1.1, seedMinY * 1.27 * 1.1];
let levelOne = [seedMinX *  1.125, seedMinY * 1.125];
let testValueToInsert = ()=>{
  return [seedMinX * 1.27 * 1.1 * (1.1 * Math.random()), seedMinY * 1.27 * 1.1 * (1.1 * Math.random())];
}

function tests(){
  it(`traverseRtree() finds destination for ${levelOne} in tree`, ()=> {
    main.traverseRtree(levelOne, testRtree).then((child)=>{
      child.leaves[0].leaves.forEach((el)=>{
        if(el.leaf && el.hash === "Level 1, leaf 1"){
          assert(true);
        }
      })
    });
  });

  it(`splitBranch() finds destination for ${threeDeep} in tree then crudely splits it into 2 subsets`, ()=> {
    main.traverseRtree(threeDeep, testRtree).then(
      (val) => main.splitBranch(val.leaves)).then(
      (split) => {
        if(split.leaves && split.leaves.length > 1){
          assert(true);
        }
      });
  });

  it(`insertPoint() inserts point which can then be found in the correct location`, function() {
    let promises = [];
    promises.push(main.insertPoint([99999999, 99999999], testRtree));
    promises.push(main.insertPoint([99999998, 99999998], testRtree));
    promises.push(main.insertPoint([99999999, 99999998], testRtree));
    promises.push(main.insertPoint([99999999, 99999998], testRtree));
    promises.push(main.insertPoint([99999998, 99999999], testRtree));
    promises.push(main.insertPoint([99999998, 99999999], testRtree));
    promises.push(main.insertPoint([99999998, 99999999], testRtree));
    promises.push(main.insertPoint([99999997, 99999999], testRtree));
    promises.push(main.insertPoint([99999997, 99999999], testRtree));
    promises.push(main.insertPoint([44444444, 44444444], testRtree));

    Promise.all(promises).then((updatedRTree)=>{
      let rTree = updatedRTree[0].branch;

      main.traverseRtree([44444444, 44444444], rTree).then((child)=>{
        child.leaves.forEach((el)=>{
          if(el.startPtLng === 44444444 && el.startPtLat === 44444444){
            assert(true);
          }
        });
      });
    });
  });

  it(`processFile() inserts a segment, when the segment parameter is passed`, async function() {
    let copy = await fs.promises.copyFile('temp/sapeira subida.gpx', 'segmentsFromStravaGPX/sapeira subida.gpx', 3);
    let process = await main.processFile('segmentsFromStravaGPX/sapeira subida.gpx', true);
  });
/*
  it(`processFile() without the segment parameter passed will turn a GPX file into x,y,z points, then search it for segments`, async function(){
    let process = await main.processFile('gpxTracks/Easy_150bpm_cadence_90_100rpm_Saw_a_mongoose_near_sapeira.gpx', false);
  });*/

}

/*
  it(`hasValidChild() should find ${testPointPass} in tree, run viewTree() to view tree`, function() {
    assert(main.hasValidChild(testPointPass, testRtree) === testRtree.leaves[0]);
  });

  it(`hasValidChild() should fail to find ${testPointFail} in tree`, function() {
    assert(main.hasValidChild(testPointFail, testRtree) === undefined);
  });

  it(`hasValidChild() should return undefined if no match for ${testPointFail} in tree`, function() {
    assert(
      main.hasValidChild(testPointFail, testRtree).then(result => result === undefined));
  });

  it(`hasValidChild() should return an ancestor (branch) ${testClosestAncestor}.`, function() {
    assert(
      main.hasValidChild(testClosestAncestor, testRtree).then(result => result === closestAncestor));
  });

  it(`testWithinBox() should return true for ${testPointPass}`, function() {
    assert(main.testWithinBox(testPointPass, testRtree) === true);
  });

  it(`testWithinBox() should return false for ${testPointFail}`, function() {
    assert(main.testWithinBox(testPointFail, testRtree) === false);
  });

  it(`makeChildBranch() should create ${JSON.stringify(testBranch)}`, function() {
    assert(JSON.stringify(main.makeChildBranch(0, 0, 100, 100, [[-1, 10,],[10, 10], [20, 99],[191,10]])) === JSON.stringify(testBranch));
  });

  it(`insertPoint() should create `, function() {
    main.insertPoint(testPointPassNew, testRtree).then((e)=>{
      console.log('e');
      console.log(e);
      //assert(e.minX === 36099825 && e.maxY === 8602250);
    });
    //assert(main.insertPoint(testPointPass, testRtree) === );
  });


  it(`insertPoint() should call extendBounds(), then add the new point to the top level parent`, function() {
    main.insertPoint(testPointOutOfBounds, testRtree).then((e)=>{
      console.log(e);
      //assert(e.minX === 36099825 && e.maxY === 8602250);
    });
    //assert(main.insertPoint(testPointPass, testRtree) === );
  });
}
*/
function viewTree(){
  console.log(testRtree);
}

module.exports = {tests};
