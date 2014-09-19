function setupAudio(canvas) {
  var c = new AudioContext();
  console.log(c);
  var buff;
  var data;
  var oldSource;
  var currentBuffer;
  var markerBuffers = {};

  function loadBuffer(context) {
    return function loadBufferWorker(path, cb) {
      var request = new XMLHttpRequest();
      request.open('GET', path, true);
      request.responseType = 'arraybuffer';

      request.onload = function() {
        context.decodeAudioData(request.response, function(theBuffer) {
          cb(null, theBuffer);
        }, function(err) {
          cb(err);
        });
      }
      request.send();
    };
  }

  function hydrateAudioBuffer(buffers, context) {
    var newBuffer = context.createBuffer(2, buffers[0].length, context.sampleRate);
    newBuffer.getChannelData(0).set(buffers[0]);
    newBuffer.getChannelData(1).set(buffers[1]);
    return newBuffer;
  }

  function success() {
    data = [buff.getChannelData(0), buff.getChannelData(1)];
    sampleRate = buff.sampleRate;
    samplesPerPixel = Math.floor(buff.length / canvas.width);

    var x, val;
    var amplitudes = [];
    for (var i = 0; i < canvas.width; i++) {
      x = i;

      val = (data[0][i * samplesPerPixel] + data[1][i * samplesPerPixel]) / 2;
      amplitude = Math.pow(Math.abs(val), 0.7);
      amplitudes.push(amplitude);
    }

    canvas.setAmplitudes(amplitudes);
  }

  function playFrom(pos) {
    currentBuffer = getBufferFrom(pos);
    playBuffer(currentBuffer);
  }

  function getBufferFrom(pos, length) {
    var newData = [];
    newData[0] = new Float32Array(data[0].subarray(pos, pos + sampleRate * length));
    newData[1] = new Float32Array(data[1].subarray(pos, pos + sampleRate * length));

    return hydrateAudioBuffer(newData, c);
  }

  function playBuffer(buffer) {
    oldSource && oldSource.stop();
    var source = c.createBufferSource();
    source.buffer = buffer;
    source.connect(c.destination);
    source.start();
    oldSource = source;
  }

  function playBufferByName(key) {
    playBuffer(markerBuffers[key]);
  }


  function updateBuffer(markerName, markerValue, markerLength) {
    markerBuffers[markerName] = getBufferFrom(markerValue, markerLength);
  }


  loadBuffer(c)('accessorise.mp3', function (err, buffer) {
    if (err) {
      console.log('error', err);
    } else {
      buff = buffer;
      success();
      updateMarkerState();
    }
  });

  return {
    playBufferByName: playBufferByName,
    playFrom: playFrom,
    updateBuffer: updateBuffer
  };
}
