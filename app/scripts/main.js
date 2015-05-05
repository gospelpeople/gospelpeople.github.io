'use strict';

$(document).ready(function () {

  $('.image-popup').magnificPopup({
    type: 'image'
  });

  $('#timeline-embed').arrive('.slider-container', function () {
    setTimeout(function () {
      $('.image-popup').magnificPopup({
        type: 'image'
      });
    }, 1000);
    $(document).unbindArrive('#timeline-embed');
  });
  $('#timeline-embed').on('UPDATE', function () {
    $('.image-popup').magnificPopup({
      type: 'image'
    });
    $('#timeline-embed .slider-container').arrive('.image-popup', function () {
      $(this).magnificPopup({
        type: 'image'
      });
    });
    $(document).unbindArrive('#timeline-embed');
  });

});
