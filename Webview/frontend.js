document.querySelector('#test').addEventListener('change' , ()=>{
  xhr(document.querySelector('#test').files[0], '/processFile',(routes)=>{
    console.log('response');
    console.log(routes);
  });
});

function xhr(items, route, callback){

    var xhr = new XMLHttpRequest();
    xhr.open('POST', route);
    xhr.setRequestHeader('Content-Type', 'application/json');
    let form = new FormData();
    form.append('test.gpx', items);
    xhr.send(form);

    if(xhr.readyState === 1){
      document.body.style.pointerEvents = 'none';
    }
    if(!window.navigator.onLine){
      document.body.style.pointerEvents = '';
    }
    xhr.onreadystatechange = function () {
      if(xhr.readyState === 4 && xhr.status === 200) {
        if(xhr.responseText){
          callback(xhr.responseText);
          document.body.style.pointerEvents = '';
          //document.querySelector('.loadingGif').style.display = 'none';
        }
      }
    };

}

function chart(lat, lng, altLat, altLng, segLat, segLng){

    const data1 = combinePointsForChart(lat, lng);
    const data2 = combinePointsForChart(altLat, altLng);
    const data3 = combinePointsForChart(segLat, segLng);

    new Chart('chart_div', {
      type: "scatter",
      responsive: true,
      data: {
        datasets: [
          {
            data: data1.map(o => ({ x: o[0], y: o[1] })),
            label: 'Original Segement data',
            showLine: true,
            fill: false,
            borderColor: 'red'
          },

          {
            data: data3.map(o => ({ x: o[0], y: o[1] })),
            label: 'Extracted Segments',
            showLine: true,
            fill: false,
            borderColor: 'green'
          },
          {
            data: data2.map(o => ({ x: o[0], y: o[1] })),
            label: 'Track Data',
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
