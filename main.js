/* globals SignallerPeerConnection */

$(function () {
  'use strict';

  var spc = new SignallerPeerConnection({
    debug: true
  });

  var videoTemplate = $('<video autoplay controls></video>');

  spc.on('localStreamAdded', function (stream) {
    var local = $('#local')[0];
    local.src = URL.createObjectURL(stream);
  });

  spc.on('remoteStreamAdded', function (stream, peer) {
    var element = videoTemplate.clone();
    element.attr({
      'class': peer,
      'src': URL.createObjectURL(stream)
    });
    $('#remotes').append(element);
  });

  spc.on('localStreamRemoved', function () {
    var local = $('#local')[0];
    local.src = '';
  });

  spc.on('remoteStreamRemoved', function (peer) {
    var remote = $('.' + peer);
    remote.remove();
  });

  $('#show').on('click', function () {
    spc.addLocalStream();
  });

  $('#hide').on('click', function () {
    spc.removeLocalStream();
  });

});