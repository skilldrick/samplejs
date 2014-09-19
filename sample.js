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
    $('#markers .' + key).find('[type=radio]').prop('checked', true);
    updateCurrentSelection();
    playAndDraw(key);
  }
}

function changeMarker() {
  currentMarker = getMarkerName(this);
}

function changeMarkerPosition() {
  selectMarker($(this).parent());
  currentMarker = getMarkerName($(this).parent().find('[type=radio]'));
  updateMarkerState();
  playAndDraw(currentMarker);
}

var timeout;
function playAndDraw(key) {
  canvas.draw(key);
  timeout = setTimeout(canvas.draw, 1000); //this is awful
  timeout && clearTimeout(timeout);
  audio.playBufferByName(key);
}

function selectMarker(node) {
  $(node).find('[type=radio]').prop('checked', true);
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
    audio.updateBuffer(markerName, markerValue);
  });

  console.log(markerState);
  canvas.draw();
}


$(function () {
  canvas = setupCanvas();
  audio = setupAudio(canvas);

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
  $('#markers p').click(function () { selectMarker(this); });
});
