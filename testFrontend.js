let segment = [11400322,5634175,10225867,11400330,5634241,10225869,11400336,5634266,10225867,11400354,5634306,10225851,11400360,5634317,10225844,11400371,5634332,10225833,11400423,5634395,10225777,11400439,5634413,10225761,11400448,5634422,10225750,11400465,5634435,10225732,11400515,5634463,10225672,11400537,5634479,10225646,11400584,5634507,10225591,11400593,5634517,10225581,11400608,5634539,10225566,11400618,5634560,10225557,11400627,5634584,10225550,11400637,5634618,10225544,11400642,5634646,10225543,11400642,5634690,10225551,11400641,5634716,10225557,11400636,5634750,10225570,11400633,5634761,10225576,11400627,5634771,10225585,11400620,5634778,10225596,11400613,5634783,10225606,11400598,5634786,10225626,11400581,5634781,10225648,11400570,5634774,10225660,11400520,5634729,10225716,11400494,5634708,10225746,11400423,5634667,10225830,11400390,5634644,10225869,11400384,5634640,10225875,11400361,5634605,10225899,11400324,5634540,10225934,11400311,5634519,10225947,11400278,5634482,10225983,11400242,5634456,10226024,11400027,5634311,10226275,11399991,5634295,10226319,11399969,5634293,10226347,11399946,5634299,10226377,11399937,5634303,10226391,11399928,5634308,10226403,11399915,5634320,10226422,11399902,5634336,10226442,11399880,5634376,10226479,11399864,5634407,10226504,11399855,5634431,10226521,11399792,5634566,10226629,11399781,5634604,10226651,11399772,5634657,10226672];

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function alterbyX(ar){
  let returnAr = [];
  let promise = new Promise((resolve, reject)=>{
    for(let i = 0; i < ar.length; i++){
      let fuzz;
      // remove some points, add uncertainty
      if(Math.random() < 0.5){
        fuzz = parseInt(ar[i] + (getRandomInt(20) * (Math.random() < 0.5 ? -1 : 1)));
        returnAr.push(fuzz);
      }
      else if(i < ar.length -1){
        continue;
      }
      if(i === ar.length -1){
        resolve(returnAr);
      }
    }
  });
  return promise;
}

function rmeverySecond(ar){
  let everysecond = [];
  for(let i = 0; i < ar.length; i++){
   if(i % 2 === 0){everysecond.push(ar[i])};
  }
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

function combinePointsForChart(lat, lng){
  let points = [];
  for(let i = 0; i < lat.length; i++){
    points.push([lat[i], lng[i]]);
    if(i === lat.length-1){
      return points;
    }
  }
}

console.warn('t-test against origial values to confirm translated points match');

// Function to find mean.
function Mean(arr, n){
    let sum = 0;
    for(let i = 0; i < n; i++)
        sum = sum + arr[i];

    return sum / n;
}
// Function to find standard
// deviation of given array.
function standardDeviation(arr, n){
    let sum = 0;
    for(let i = 0; i < n; i++)
        sum = sum + (arr[i] - Mean(arr, n)) *
                    (arr[i] - Mean(arr, n));

    return Math.sqrt(sum / (n - 1));
}
// Function to find t-test of
// two set of statistical data.
function tTest(arr1, n, arr2, m){
  let promise = new Promise((resolve, reject)=>{
    n = (n) ?  n : arr1.length;
    m = (m) ?  m : arr2.length;
    let mean1 = Mean(arr1, n);
    let mean2 = Mean(arr2, m);
    let sd1 = standardDeviation(arr1, n);
    let sd2 = standardDeviation(arr2, m);

    // Formula to find t-test
    // of two set of data.
    let t_test = (mean1 - mean2) /
         Math.sqrt((sd1 * sd1) /
               n + (sd2 * sd2) / m);
    resolve(t_test.toFixed(5));
  });
  return promise;

}

async function fire(){
    let lat = await getXYZ('lat', segment),
        altLat = await alterbyX(lat, 0),
        lng = await getXYZ('lng', segment),
        altLng = await alterbyX(lng, 0),
        latT = await tTest(lat, false, altLat, false),
        lngT = await tTest(lng, false, altLng, false),
        latCertainty = 100 - Math.abs((latT) * 100),
        lngCertainty = 100 - Math.abs((lngT) * 100);

    console.log(latCertainty);
    console.log(lngCertainty);

    if(latCertainty >= 99 && lngCertainty >= 99){
      document.querySelector('#fitData').textContent =
        `Latitude values match with ${latCertainty}% certainty,
         longitude values match with ${lngCertainty}% certainty`;
      chart(lat, lng, altLat, altLng);
    }else{
      let it = document.querySelector('#iterations').textContent;
      document.querySelector('#iterations').textContent = `${parseInt(it) + 1}`;
      //fire();
    }
}

fire();

function chart(lat, lng, altLat, altLng){
    const data1 = combinePointsForChart(lat, lng);
    const data2 = combinePointsForChart(altLat, altLng);

    new Chart('chart_div', {
      type: "scatter",
      responsive: true,
      data: {
        datasets: [
          {
            data: data1.map(o => ({ x: o[0], y: o[1] })),
            label: 'Clean data',
            showLine: true,
            fill: false,
            borderColor: 'red'
          },
          {
            data: data2.map(o => ({ x: o[0], y: o[1] })),
            label: 'Fuzzy data',
            showLine: true,
            fill: false,
            borderColor: 'blue'
          }
        ]
      },
      options: {
        scales: {
          yAxes: [{
            ticks: {
              beginAtZero: false
            }
          }]
        }
      }
    });
}
