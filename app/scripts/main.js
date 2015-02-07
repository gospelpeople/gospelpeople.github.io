'use strict';

$(document).ready(function () {

  $('#timeline-embed').arrive('.vco-main', function () {
    $('.image-popup').magnificPopup({
      type: 'image'
    });
    $(document).unbindArrive('#timeline-embed');
  });
  $('#timeline-embed').on("UPDATE", function () {
    $('#timeline-embed').arrive('.image-popup', function () {
      $(this).magnificPopup({
        type: 'image'
      });
    });
    $(document).unbindArrive('#timeline-embed');
  });

});
