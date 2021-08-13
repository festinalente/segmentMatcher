let datasets = [];

function pushPoints(lat, lng, color, label){
  let data = combinePointsForChart(lat, lng);
  datasets.push({
    data: data.map(o => ({ x: o[0], y: o[1] })),
    label: label,
    showLine: true,
    fill: false,
    borderColor: color
  });
}

document.querySelector('#submitGpx').addEventListener('click' , ()=>{
  formxhr(document.querySelector('#uploadGpx').files[0], '/processFile', (points)=>{
    /*{ extractedSegments : extractedSegments,
        originalSegments: lookUpSegments,
        originalFileInXYZ: toCoordinates } */
    points = JSON.parse(points);

    (async()=>{
      let latTrack = await getXYZ('lat', points.originalFileInXYZ);
      let lngTrack = await getXYZ('lng', points.originalFileInXYZ);
      pushPoints(latTrack, lngTrack, 'blue', 'Track');

      if(points.message){
        alert(points.message);
        chart();
        return;
      }

      let j = 0;
      while (j < points.originalSegments.length) {
        let segLat = await getXYZ('lat', points.originalSegments[j]);
        let segLng = await getXYZ('lng', points.originalSegments[j]);
        pushPoints(segLat, segLng, 'yellow', `Original segment ${j}`);
        j++;
      }

      let i = 0;
      while (i < points.extractedSegments.length) {
        let segLat = await getXYZ('lat', points.extractedSegments[i]);
        let segLng = await getXYZ('lng', points.extractedSegments[i]);
        pushPoints(segLat, segLng, 'red', `Extracted segment ${i}`);
        i++;
      }
      datasets.reverse();
      chart();


    })();
  });
});

function formxhr(items, route, callback){
  const xhr = new XMLHttpRequest();
  xhr.open('POST', route);
  let formData = new FormData();
  formData.append('gpx', items);
  xhr.send(formData);
  xhr.onreadystatechange = function () {
    if(xhr.readyState === 4 && xhr.status === 200) {
      callback(xhr.responseText);
    }
    if(xhr.readyState === 4 && xhr.status === 500){
      //console.log(xhr.responseText);
      //n.b. make errors useful, this is actual error text:
      callback(xhr.responseText);
    }
  };
};

function combinePointsForChart(lat, lng){
  let points = [];
  for(let i = 0; i < lat.length; i++){
    points.push([lat[i], lng[i]]);
    if(i === lat.length-1){
      return points;
    }
  }
};

function getXYZ(xyz, segment){
  if(segment.length % 3 !== 0){
    alert('segment is the wrong length');
    console.log([...arguments]);
  }
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
         console.log(returnVal);
         resolve(returnVal);
       };
    }
  });
  return promise;
}


function chart(){
  new Chart('chart_div', {
    type: "scatter",
    responsive: true,
    data: {
      datasets: datasets
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
