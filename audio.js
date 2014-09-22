function setupAudio(canvas) {
  var c;
  var master;
  var buff;
  var data;
  var oldSource;
  var interval;
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
    playBuffer(currentBuffer, pos);
  }

  function getBufferFrom(pos, length) {
    var newData = [];
    newData[0] = new Float32Array(data[0].subarray(pos, pos + sampleRate * length));
    newData[1] = new Float32Array(data[1].subarray(pos, pos + sampleRate * length));

    return hydrateAudioBuffer(newData, c);
  }

  function makeDistortionCurve(func) {
    var length = Math.pow(2, 16);
    var halfLength = length / 2;
    var curve = [];
    for (var i = 0; i < length; i++) {
      curve[i] = i / (length / 2) - 1;
    }

    function mirror(func) {
      return function (item, i, arr) {
        if (i < arr.length / 2) {
          return -func(-item);
        } else {
          return func(item);
        }
      };
    }

    curve = curve.map(mirror(func));

    //keep within -1,1 range
    curve = curve.map(function (item) {
      return Math.max(Math.min(item, 1), -1);
    });

    drawCurve(curve);

    return new Float32Array(curve);
  };

  function drawCurve(curve) {
    var distCanvas = document.getElementById('distortion');
    var ctx = distCanvas.getContext('2d');
    var width = distCanvas.width;
    var height = distCanvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "gray";
    ctx.strokeWidth = 1;
    ctx.strokeRect(0, 0, width, height);
    ctx.beginPath();
    ctx.moveTo(0, height / 2 - 0.5);
    ctx.lineTo(width, height / 2 - 0.5);
    ctx.moveTo(width / 2 - 0.5, 0);
    ctx.lineTo(width / 2 - 0.5, height);
    ctx.stroke();

    var curvePoints = [];
    for (var i = 0; i < curve.length; i += Math.ceil(curve.length / width)) {
      curvePoints.push(((curve[i] + 1) / 2) * height);
    }

    ctx.fillStyle = "black";
    for (var i = 0; i < curvePoints.length; i++) {
      ctx.fillRect(i - 1.5, height - curvePoints[i] - 1.5, 3, 3);
    }
  }

  function drawMeter(level, maxMax) {
    var meterCanvas = document.getElementById('meter');
    var ctx = meterCanvas.getContext('2d');
    var width = meterCanvas.width;
    var height = meterCanvas.height;

    var hue = (maxMax / 2 + 0.5) * 360;
    var lineColor = "hsla(" + hue + ",100%,50%,1)";

    ctx.clearRect(0, 0, width, height);
    ctx.strokeWidth = 1;
    ctx.strokeRect(0, 0, width, height);


    ctx.save();
    ctx.fillStyle = lineColor;
    //ctx.fillStyle = "black";
    ctx.fillRect(0, height - (level * height), width, level * height);
    ctx.fillRect(0, height - (maxMax * height), width, 1);
    ctx.restore();
  }

  function addDelay(options) {
    var dryMix = options.dryMix || 1;
    var wetMix = options.wetMix || 0.5;
    var distortion = options.distortion || 1;
    var delayTime = options.delayTime || 0.5;
    var feedback = options.feedback || 0.2;
    var cutoff = options.cutoff || 5000;
    var source = options.source;
    var destination = options.destination;

    var delay = c.createDelay(3);
    var feedbackGain = c.createGain();
    var dryMixNode = c.createGain();
    var wetMixNode = c.createGain();
    var distortionNode = c.createWaveShaper();
    var filter = c.createBiquadFilter();
    distortionNode.curve = makeDistortionCurve(function (item) {
      return Math.pow(Math.sin(item * Math.PI / 2), 1 / distortion);
    });
    distortionNode.oversample = '4x';

    delay.delayTime.value = delayTime;
    feedbackGain.gain.value = feedback;
    dryMixNode.gain.value = dryMix;
    wetMixNode.gain.value = wetMix;

    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    filter.Q.value = .5;

    source.connect(dryMixNode);
    dryMixNode.connect(destination);
    source.connect(distortionNode);
    distortionNode.connect(filter);
    filter.connect(feedbackGain);
    feedbackGain.connect(delay);
    delay.connect(distortionNode);
    delay.connect(wetMixNode);
    wetMixNode.connect(destination);

    //source +-> dryMixNode ------------------------------------------------------*-> destination
    //       `> distortionNode -> filter -> feedbackGain -> delay -+> wetMixNode -'
    //            ^------------------------------------------------'
  }

  function playBuffer(buffer, pos) {
    interval && clearInterval(interval);
    oldSource && oldSource.stop();

    canvas.setPlayPosition(pos);
    var startTime = c.currentTime;
    /*
    interval = setInterval(function () {
      canvas.setPlayPosition(pos, (c.currentTime - startTime) * sampleRate); //TODO:
      console.log(c.currentTime - startTime);
    }, 500);
    */

    var source = c.createBufferSource();
    source.buffer = buffer;
    source.connect(master);

    console.log(c);
    source.start();
    oldSource = source;
  }

  function playBufferByName(key) {
    var bufferInfo = markerBuffers[key];
    playBuffer(bufferInfo[0], bufferInfo[1]);
  }


  function updateBuffer(markerName, pos, markerLength) {
    markerBuffers[markerName] = [getBufferFrom(pos, markerLength), pos];
  }


  function loadTrack(track) {
    loadBuffer(c)(track, function (err, buffer) {
      if (err) {
        console.log('error', err);
      } else {
        buff = buffer;
        success();
        updateMarkerState();
      }
    });
  }

  function setupAnalyser(analyser) {
    var length = analyser.fftSize;
    var arr = new Float32Array(length);
    var maxMax = 0;
    setInterval(function () {
      analyser.getFloatTimeDomainData(arr);
      var max = 0;
      for (var i = 0; i < length; i++) {
        max = Math.max(Math.abs(arr[i]), max);
      }
      maxMax = Math.max(max, maxMax)
      drawMeter(max, maxMax);
      maxMax -= 0.0005;
    }, Math.floor(1000 * length / sampleRate));

  }

  function setup() {
    c = new AudioContext()
    loadTrack('accessorise.mp3');
    master = c.createGain();
    var analyser = c.createAnalyser()
    analyser.connect(c.destination);

    addDelay({
      source: master,
      destination: analyser,
      delaytime: 0.5,
      feedback: 0.2,
      drymix: 1,
      wetmix: 1,
      distortion: 1.2,
      cutoff: 5000
    });
    setupAnalyser(analyser);
  }

  setup();

  return {
    playBufferByName: playBufferByName,
    playFrom: playFrom,
    updateBuffer: updateBuffer
  };
}
