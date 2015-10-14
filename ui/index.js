'use strict';
const typeahead = require('typeahead');
const Bloodhound = typeahead.Bloodhound;
const jquery = require('jquery');
const Webcam = require('webcamjs');
// const handlebars = require('handlebars');

const model = {
  newmemberid: null,
  proxyid: null,
  photo: null,
  photoready: false,
  conflict: null
};

const members = new Map(); // newmemberid -> full

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

function fetchMembers() {
  jquery.ajax({
    url: '/newmemberid',
    type: 'get',
    dataType: 'json',
    success: function(rows) {
      if (!Array.isArray(rows)) {
        console.error('Unexpected state', rows);
        return;
      }
      for (var row of rows) {
        members.set(row.id, row.value);
      }
    },
    error: function() {
      console.log('check error', arguments);
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
        return members.get(datum.id) + ' (' + col + ')';
      }
    });
  }
  // Setup member search
  jquery('#bloodhound .typeahead').typeahead({
    hint: true,
    highlight: true,
    minLength: 1
  }, args).on('typeahead:select', function(ev, datum) {
    model.newmemberid = datum.id;
    checkCollectedStatus(datum.id);
  }).on('typeahead:autocomplete', function(ev, datum) {
    model.newmemberid = datum.id;
    checkCollectedStatus(datum.id);
  });

  // Setup proxy search
  jquery('#bloodhound2 .typeahead').typeahead({
    hint: true,
    highlight: true,
    minLength: 1
  }, args).on('typeahead:select', function(ev, datum) {
    model.proxyid = datum.id;
  }).on('typeahead:autocomplete', function(ev, datum) {
    model.proxyid = datum.id;
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
    model.photoready = true;
    applyState();
	}
	function cancel_preview() {
		// cancel preview freeze and return to live camera feed
		Webcam.unfreeze();
    model.photoready = false;

    applyState();
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
      if (!Array.isArray(data.rows)) {
        console.error('Unexpected state', data);
        return;
      }
      if (data.rows.length === 0) {
        console.log('OK no slip collected yet');
        model.conflict = null;
      } else {
        model.conflict = data.rows[0];
      }
      applyState();
    },
    error: function() {
      console.log('check error', arguments);
    }
  });
}

function resetForm() {
  model.photo = null;
  model.newmemberid = null;
  model.photoready = false;
  model.proxyid = null;
  model.conflict = null;
  applyState();
}
document.getElementById('reset').addEventListener('click', resetForm);

function submit() {
  if (!isComplete()) {
    applyState();
    return;
  }
  Webcam.snap(function(data_uri) {
    model.photo = data_uri;
    jquery.ajax({
      url: '/collect',
      type: 'post',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({
        newmemberid: model.newmemberid,
        proxyid: model.proxyid,
        photo: data_uri
      }),
      success: function() {
        // Great success! should we display a success message.
        alert('Please collect your voting slip');
        resetForm();
      },
      error: function() {
        console.log('check error', arguments);
      }
    });
  });

}
document.getElementById('collect').addEventListener('click', submit);

function isComplete() {
  return model.newmemberid && model.photoready && !model.conflict;
}

function applyState() {
  if (!model.newmemberid) {
    jquery('#bloodhound .typeahead').typeahead('val', '');
  }
  if (!model.proxyid) {
    jquery('#bloodhound2 .typeahead').typeahead('val', '');
  }
  if (model.photoready) {
		document.getElementById('pre_take_buttons').style.display = 'none';
		document.getElementById('post_take_buttons').style.display = '';
  } else {
    try{
      Webcam.unfreeze();
    } catch(x) {}
		document.getElementById('pre_take_buttons').style.display = '';
		document.getElementById('post_take_buttons').style.display = 'none';
  }
  displayConflict();
  if (isComplete()) {
    jquery('#collect').prop('disabled', false);
  } else {
    jquery('#collect').prop('disabled', true);
  }
}

function displayConflict() {
  if (model.conflict) {
    document.getElementById('conflict').innerHTML =
					'<p class="lead">Someone already collected a slip for the selected member</p>' +
					'<img src="'+model.conflict.photo+'"/>';
  } else {
    document.getElementById('conflict').innerHTML = '';
  }
}

fetchMembers();
setupSearches();
setupWebcam();
applyState();
