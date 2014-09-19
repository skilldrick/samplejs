//TODO:
//* use trackpad to zoom in and out
//* tabs along bottom for each sample point
//
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

var oldSource;
var currentBuffer;
var markerState = {};
var markerBuffers = {};
var currentMarker;

var samplesPerPixel;


function success() {
  data = [buff.getChannelData(0), buff.getChannelData(1)];

  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  width = canvas.width;
  height = canvas.height;
  halfHeight = height / 2;
  samplesPerPixel = Math.floor(buff.length / width);

  var x, val;
  for (var i = 0; i < width; i++) {
    x = i;

    val = (data[0][i * samplesPerPixel] + data[1][i * samplesPerPixel]) / 2;
    amplitude = Math.pow(Math.abs(val), 0.7) * halfHeight;
    amplitudes.push(amplitude);
    //ctx.fillRect(x, halfHeight - amplitude, 1, amplitude * 2);
  }

  /*
  var source = c.createBufferSource();
  source.buffer = buff;
  source.connect(c.destination);
  source.start();
  */
}

function draw(playing) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgb(100, 100, 100)";
  for (var i = 0; i < amplitudes.length; i++) {
    ctx.fillRect(i, halfHeight - amplitudes[i], 1, amplitudes[i] * 2);
  }

  Object.keys(markerState).forEach(function (key) {
    drawMarker(markerState[key], key, key === playing);
  });
}

function drawMarker(pos, key, isCurrent) {
  var pos = markerState[key];
  var x = Math.floor((1 / samplesPerPixel) * pos);
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(x, 0, 2, height);

  var size = 10;
  ctx.fillStyle = isCurrent ? "blue" : "gray";
  ctx.fillRect(x, height - size, size, size);
  ctx.fillStyle = "white";
  ctx.textBaseline = "top";
  ctx.fillText(key, x + 1, height + 1 - size);
  ctx.restore();

}


function canvasClick(e) {
  var x;
  var body = document.body;
  var html = document.documentElement;
  var canoffset = $(this).offset();

  x = e.clientX + body.scrollLeft + html.scrollLeft - Math.floor(canoffset.left);

  var pos = Math.floor(x * samplesPerPixel);

  setPosition(currentMarker, pos);
  playFrom(pos);
}


function playFrom(pos) {
  currentBuffer = getBufferFrom(pos);
  playBuffer(currentBuffer);
}

function getBufferFrom(pos) {
  var newData = [];
  newData[0] = new Float32Array(data[0].subarray(pos, pos + 44100));
  newData[1] = new Float32Array(data[1].subarray(pos, pos + 44100));

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

function keyPress(key) {
  if (!currentBuffer) return;

  if (key) {
    $('#markers .' + key).find('[type=radio]').prop('checked', true);
    updateCurrentSelection();
    draw(key);
    playBuffer(markerBuffers[key]);
    setTimeout(draw, 1000); //this is awful
  }
}

function changeMarker() {
  currentMarker = getMarkerName(this);
}

function changeMarkerPosition() {
  updateMarkerState();
}

function selectMarker() {
  $(this).find('[type=radio]').prop('checked', true);
  updateCurrentSelection();
}

function getMarkerName(radio) {
  return $(radio).val();
}

function setPosition(marker, pos) {
  setMarkerValue(marker, pos);
  updateMarkerState();
}

function updateCurrentSelection() {
  currentMarker = $('#markers [type=radio]:checked').val();
}

function getMarkerValue(node) {
  return +$(node).find('[type=number]').val() * 44100;
}

function setMarkerValue(marker, pos) {
  var seconds = Math.round(10 * pos / 44100) / 10;
  $('#markers .' + marker + ' [type=number]').val(seconds);
}

function updateMarkerState() {
  $('#markers p').each(function () {
    var $radio = $(this).find('[type=radio]');
    var markerName = getMarkerName($radio);
    if ($radio.is(':checked')) {
      currentMarker = markerName;
    }
    var markerValue = getMarkerValue(this);
    markerState[markerName] = markerValue;
    markerBuffers[markerName] = getBufferFrom(markerValue);
  });

  console.log(markerState);
  draw();
}


$(function () {
  loadBuffer(c)('accessorise.mp3', function (err, buffer) {
    if (err) {
      console.log('error', err);
    } else {
      buff = buffer;
      success();
      updateMarkerState();
    }
  });

  $('#canvas').click(canvasClick);

  $(document).keypress(function (e) {
    var keys = {
      97: "A",
      115: "S",
      100: "D",
      102: "F",
      103: "G"
    };

    keyPress(keys[e.which]);
  });

  $('#markers input[type=radio]').change(changeMarker);
  $('#markers input[type=number]').change(changeMarkerPosition);
  $('#markers p').click(selectMarker);
});
