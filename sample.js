var canvas, audio;

var markerState = {};
var currentMarker;
var samplesPerPixel;
var sampleRate;


function canvasClick(e) {
  var x;
  var body = document.body;
  var html = document.documentElement;
  var canoffset = $(this).offset();

  x = e.clientX + body.scrollLeft + html.scrollLeft - Math.floor(canoffset.left);

  var pos = Math.floor(x * samplesPerPixel);

  setPosition(currentMarker, pos);
  audio.playBufferByName(currentMarker);
}


function keyPress(key) {
  if (key) {
    $('#markers .' + key).find('.marker-radio').prop('checked', true);
    updateCurrentSelection();
    playAndDraw(key);
  }
}



function decreaseLength() {
  changeLength(-0.1);
}

function increaseLength() {
  changeLength(0.1);
}

function changeLength(amount) {
  var $node = $('#markers .' + currentMarker + ' .marker-length');
  changeNodeValue($node, amount);
}

function decreaseStartTime() {
  changeStartTime(-0.1);
}

function increaseStartTime() {
  changeStartTime(0.1);
}

function changeStartTime(amount) {
  var $node = $('#markers .' + currentMarker + ' .marker-value');
  changeNodeValue($node, amount);
}

function changeNodeValue($node, amount) {
  var newValue = roundTo(+$node.val() + amount, 10)
  var min = +$node.prop('min');
  if (newValue >= min) {
    $node.val(newValue);
    $node.change();
  }
}

function arrowPress(arrow) {
  switch (arrow) {
  case 'left':
    decreaseLength();
    break;
  case 'right':
    increaseLength();
    break;
  case 'down':
    decreaseStartTime();
    break;
  case 'up':
    increaseStartTime();
    break;
  }
}

function roundTo(number, multiplier) {
  return Math.round(multiplier * number) / multiplier;
}

function changeMarker() {
  currentMarker = getMarkerName(this);
}

function changeMarkerPosition() {
  selectMarker($(this).closest('.row'));
  currentMarker = getMarkerName($(this).closest('.row').find('.marker-radio'));
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
  return Math.round($(node).find('.marker-value').val() * sampleRate);
}

function getMarkerLength(node) {
  return +$(node).find('.marker-length').val();
}

function setMarkerValue(marker, pos) {
  var seconds = roundTo(pos / sampleRate, 10);
  $('#markers .' + marker + ' .marker-value').val(seconds);
}

function updateMarkerState() {
  $('#markers .marker').each(function () {
    var $radio = $(this).find('.marker-radio');
    var markerName = getMarkerName($radio);
    if ($radio.is(':checked')) {
      currentMarker = markerName;
    }
    var markerValue = getMarkerValue(this);
    var markerLength = getMarkerLength(this);
    markerState[markerName] = [markerValue, markerLength];
    audio.updateBuffer(markerName, markerValue, markerLength);
  });

  canvas.draw();
}

function buildDom() {
  var html = '<p class="{{key}} marker row">';
  html += '<span class="col-1"><input class="marker-radio" type="radio" name="marker" value="{{key}}"> {{key}}</span>';
  html += '<span class="col-2"><input class="marker-value" type="number" value="{{value}}" min=0 step=0.1> s</span>';
  html += '<span class="col-3"><input class="marker-length" type="number" value="0.5" min=0.1 step=0.1> s</span>';
  html += '</p>';

  var $markers = $('#markers');
  var keys = ["1", "2", "3", "4",
              "Q", "W", "E", "R",
              "A", "S", "D", "F",
              "Z", "X", "C", "V"];

  var count = 0;
  var position;
  keys.forEach(function (key) {
    count++;
    position = count * 4;
    $markers.append(html.replace(/{{key}}/g, key).replace(/{{value}}/g, position));
    if (count%4 == 0) {
      $markers.append('</p>');
    }
  });

  $markers.find('.A .marker-radio').prop('checked', true);

  var keyMap = {};
  keys.forEach(function (key) {
    var charCode = key.toUpperCase().charCodeAt(0);
    keyMap[charCode] = key;
  });
  return keyMap;
}


$(function () {
  var keyMap = buildDom();
  canvas = setupCanvas();
  audio = setupAudio(canvas);

  $('#canvas').click(canvasClick);

  var arrowMap = {
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down'
  };
  $(document).keydown(function (e) {
    keyPress(keyMap[e.which]);
    arrowPress(arrowMap[e.which]);
  });

  $('#markers .marker-radio').change(changeMarker);
  $('#markers .marker-value, #markers .marker-length').change(changeMarkerPosition);
  $('#markers p').click(function () { selectMarker(this); });
});
