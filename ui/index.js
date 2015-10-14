'use strict';
const typeahead = require('typeahead');
const Bloodhound = typeahead.Bloodhound;
const jquery = require('jquery');
const Webcam = require('webcamjs');
// const handlebars = require('handlebars');

function constructSuggestions(col) {
  return new Bloodhound({
    datumTokenizer: function(datum) {
      return Bloodhound.tokenizers.whitespace(datum.value);
    },
    queryTokenizer: function(query) {
      return Bloodhound.tokenizers.whitespace(query);
    },
    identify: function midentify(obj) {
      return obj.id;
    },
    prefetch: {
      url: '/' + col,
      cache: false
    }
  });
}

function setupSearches() {
  const searchableColumns = ['famname', 'firstname', 'preferredname', 'nric'];
  const args = [];

  for (let col of searchableColumns) {
    args.push({
      name: col,
      source: constructSuggestions(col),
      display: function(datum) {
        return datum.full + ' (' + col + ')';
      }
    });
  }
  // Setup member search
  jquery('#bloodhound .typeahead').typeahead({
    hint: true,
    highlight: true,
    minLength: 1
  }, args).on('typeahead:select', function(ev, datum) {
    console.log('typeahead:select - 2', datum);
    checkCollectedStatus(datum.id);
  }).on('typeahead:autocomplete', function(ev, datum) {
    console.log('typeahead:autocomplete - 2', datum);
    checkCollectedStatus(datum.id);
  });

  // Setup proxy search
  jquery('#bloodhound2 .typeahead').typeahead({
    hint: true,
    highlight: true,
    minLength: 1
  }, args).on('typeahead:select', function(ev, datum) {
    console.log('typeahead:select', datum);
    checkCollectedStatus(datum.id);
  }).on('typeahead:autocomplete', function(ev, datum) {
    console.log('typeahead:autocomplete', datum);
    checkCollectedStatus(datum.id);
  });

}

function setupWebcam() {
  // Setup webcam booth
  Webcam.set({
			width: 320,
			height: 240,
			dest_width: 640,
			dest_height: 480,
			image_format: 'jpeg',
			jpeg_quality: 90
		});
  Webcam.attach('#booth');

  // preload shutter audio clip
  var shutter = new Audio();
  shutter.autoplay = false;
  shutter.src = navigator.userAgent.match(/Firefox/) ? '/resources/shutter.ogg' : '/resources/shutter.mp3';

  document.getElementById('preview_snapshot').addEventListener('click', preview_snapshot);
  document.getElementById('cancel_preview').addEventListener('click', cancel_preview);
  // document.getElementById('save_photo').addEventListener('click', save_photo);

  function preview_snapshot() {
    console.log('preview_snapshot');
  	// play sound effect
  	shutter.play();
		// freeze camera so user can preview pic
		Webcam.freeze();

		// swap button sets
		document.getElementById('pre_take_buttons').style.display = 'none';
		document.getElementById('post_take_buttons').style.display = '';
	}
	function cancel_preview() {
		// cancel preview freeze and return to live camera feed
		Webcam.unfreeze();

		// swap buttons back
		document.getElementById('pre_take_buttons').style.display = '';
		document.getElementById('post_take_buttons').style.display = 'none';
	}

	function save_photo() {
		// actually snap photo (from preview freeze) and display it
		Webcam.snap(function(data_uri) {
			// // display results in page
			// document.getElementById('results').innerHTML =
			// 	'<h2>Here is your image:</h2>' +
			// 	'<img src="'+data_uri+'"/>';

			// swap buttons back
			document.getElementById('pre_take_buttons').style.display = '';
			document.getElementById('post_take_buttons').style.display = 'none';
		});
	}
}

function checkCollectedStatus(newmemberid) {
  jquery.ajax({
    url: '/check',
    type: 'get',
    data: { id: newmemberid },
    dataType: 'json',
    success: function(data) {
      console.log('got the data back', data);
    },
    error: function() {
      console.log('check error', arguments);
    }
  });
}

setupSearches();
setupWebcam();
