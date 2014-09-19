function setupCanvas() {

  var canvas = document.getElementById('canvas');
  var ctx = canvas.getContext('2d');
  var width = canvas.width;
  var height = canvas.height;
  var halfHeight = height / 2;
  var amplitudes;

  loading();


  function loading() {
    ctx.save();

    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = "30pt Arial";
    ctx.fillText("Loading audio ...", width / 2, height / 2);

    ctx.restore();
  }

  function draw(playing) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgb(100, 100, 100)";
    for (var i = 0; i < amplitudes.length; i++) {
      ctx.fillRect(i, halfHeight - amplitudes[i], 1, amplitudes[i] * 2);
    }

    Object.keys(markerState).forEach(function (key) {
      drawMarker(markerState[key][0], markerState[key][1], key, key === playing);
    });
  }

  function drawMarker(pos, widthInSeconds, key, isCurrent) {
    var x = Math.floor((1 / samplesPerPixel) * pos);
    var width = Math.floor(widthInSeconds * sampleRate / samplesPerPixel);
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x, 0, width, height);

    var size = 10;
    ctx.fillStyle = isCurrent ? "blue" : "gray";
    ctx.fillRect(x, height - size, size, size);
    ctx.fillStyle = "white";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.font = "7pt Arial";
    ctx.fillText(key, x + 1, height + 1 - size);
    ctx.restore();
  }

  function setAmplitudes(_amplitudes) {
    // scale amplitudes to fit canvas
    amplitudes = _amplitudes.map(function (amp) {
      return amp * halfHeight;
    });
  }

  return {
    draw: draw,
    width: width,
    setAmplitudes: setAmplitudes
  };
}
