var canvas, audio;

var markerState = {};
var currentMarker;
var samplesPerPixel;


function canvasClick(e) {
  var x;
  var body = document.body;
  var html = document.documentElement;
  var canoffset = $(this).offset();

  x = e.clientX + body.scrollLeft + html.scrollLeft - Math.floor(canoffset.left);

  var pos = Math.floor(x * samplesPerPixel);

  setPosition(currentMarker, pos);
  audio.playFrom(pos);
}


function keyPress(key) {
  if (key) {
    $('#markers .' + key).find('.marker-radio').prop('checked', true);
    updateCurrentSelection();
    playAndDraw(key);
  }
}

function changeMarker() {
  currentMarker = getMarkerName(this);
}

function changeMarkerPosition() {
  selectMarker($(this).parent());
  currentMarker = getMarkerName($(this).parent().find('.marker-radio'));
  updateMarkerState();
  playAndDraw(currentMarker);
}

var timeout;
function playAndDraw(key) {
  canvas.draw(key);
  timeout && clearTimeout(timeout);
  timeout = setTimeout(canvas.draw, 1000); //this is awful
  audio.playBufferByName(key);
}

function selectMarker(node) {
  $(node).find('.marker-radio').prop('checked', true);
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
  currentMarker = $('#markers .marker-radio:checked').val();
}

function getMarkerValue(node) {
  return Math.round($(node).find('.marker-value').val() * audio.sampleRate());
}

function setMarkerValue(marker, pos) {
  var seconds = Math.round(10 * pos / audio.sampleRate()) / 10;
  $('#markers .' + marker + ' .marker-value').val(seconds);
}

function updateMarkerState() {
  $('#markers p').each(function () {
    var $radio = $(this).find('.marker-radio');
    var markerName = getMarkerName($radio);
    if ($radio.is(':checked')) {
      currentMarker = markerName;
    }
    var markerValue = getMarkerValue(this);
    markerState[markerName] = markerValue;
    audio.updateBuffer(markerName, markerValue);
  });

  console.log(markerState);
  canvas.draw();
}

function buildDom() {
  var html = '<p class="{{key}}"><input class="marker-radio" type="radio" name="marker" value="{{key}}">{{key}} <input class="marker-value" type="number" value="0" min=0 step=0.1></p>';

  var $markers = $('#markers');
  var keys = ["A", "S", "D", "F"];
  keys.forEach(function (key) {
    $markers.append(html.replace(/{{key}}/g, key));
  });

  $markers.find('.A .marker-radio').prop('checked', true);

  var keyMap = {};
  keys.forEach(function (key) {
    var charCode = key.toLowerCase().charCodeAt(0);
    keyMap[charCode] = key;
  });
  return keyMap;
}


$(function () {
  var keyMap = buildDom();
  canvas = setupCanvas();
  audio = setupAudio(canvas);

  $('#canvas').click(canvasClick);

  $(document).keypress(function (e) {
    keyPress(keyMap[e.which]);
  });

  $('#markers .marker-radio').change(changeMarker);
  $('#markers .marker-value').change(changeMarkerPosition);
  $('#markers p').click(function () { selectMarker(this); });
});
