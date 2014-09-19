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

var c = new AudioContext();
var buff;
var data;
var canvas, ctx, width, height, halfHeight;
var amplitudes = [];


function success() {
  data = [buff.getChannelData(0), buff.getChannelData(1)];

  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  width = canvas.width;
  height = canvas.height;
  halfHeight = height / 2;
  var jump = Math.floor(buff.length / width);

  var x, val;
  for (var i = 0; i < width; i++) {
    x = i;

    val = (data[0][i * jump] + data[1][i * jump]) / 2;
    amplitude = Math.pow(Math.abs(val), 0.7) * halfHeight;
    amplitudes.push(amplitude);
    //ctx.fillRect(x, halfHeight - amplitude, 1, amplitude * 2);
  }

  draw();

  /*
  var source = c.createBufferSource();
  source.buffer = buff;
  source.connect(c.destination);
  source.start();
  */
}

function draw() {
  for (var i = 0; i < amplitudes.length; i++) {
    ctx.fillRect(i, halfHeight - amplitudes[i], 1, amplitudes[i] * 2);
  }
}



function canvasClick(e) {
  var x;
  var body = document.body;
  var html = document.documentElement;
  var canoffset = $(this).offset();

  x = e.clientX + body.scrollLeft + html.scrollLeft - Math.floor(canoffset.left);

  var pos = Math.floor(x / width * buff.length);

  playFrom(pos);
}

var oldSource;

function playFrom(pos) {
  oldSource && oldSource.stop();
  var newData = [];
  newData[0] = new Float32Array(data[0].subarray(pos, pos + 44100));
  newData[1] = new Float32Array(data[1].subarray(pos, pos + 44100));

  var newBuffer = hydrateAudioBuffer(newData, c);

  var source = c.createBufferSource();
  source.buffer = newBuffer;
  source.connect(c.destination);
  source.start();
  oldSource = source;
}

$(function () {
  loadBuffer(c)('accessorise.mp3', function (err, buffer) {
    if (err) {
      console.log('error', err);
    } else {
      buff = buffer;
      success();
    }
  });

  $('#canvas').click(canvasClick);
});
