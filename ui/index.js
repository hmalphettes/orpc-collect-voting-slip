'use strict';
const typeahead = require('typeahead');
const Bloodhound = typeahead.Bloodhound;
const jquery = require('jquery');
const Webcam = require('webcamjs');

var memberSearchInput;

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
  memberSearchInput = jquery('#bloodhound .typeahead').typeahead({
    hint: true,
    highlight: true,
    minLength: 1
  }, args).on('typeahead:select', function(ev, datum) {
    model.newmemberid = datum.id;
    jquery('#bloodhound .typeahead').typeahead('val', members.get(datum.id));
    checkCollectedStatus(datum.id);
  }).on('typeahead:autocomplete', function(ev, datum) {
    model.newmemberid = datum.id;
    jquery('#bloodhound .typeahead').typeahead('val', members.get(datum.id));
    checkCollectedStatus(datum.id);
  }).on('keydown', function() {
    if (model.conflict) {
      resetForm();
    }
  })[0];

  // Setup proxy search
  jquery('#bloodhound2 .typeahead').typeahead({
    hint: true,
    highlight: true,
    minLength: 1
  }, args).on('typeahead:select', function(ev, datum) {
    model.proxyid = datum.id;
    jquery('#bloodhound2 .typeahead').typeahead('val', members.get(datum.id));
  }).on('typeahead:autocomplete', function(ev, datum) {
    model.proxyid = datum.id;
    jquery('#bloodhound2 .typeahead').typeahead('val', members.get(datum.id));
  });

  // place the cursor on the member input search:
  memberSearchInput.focus();
  memberSearchInput.select();
}

function setupWebcam() {
  // Setup webcam booth
  Webcam.set({
			width: 320,
			height: 240,
			dest_width: 320,
			dest_height: 240,
			image_format: 'jpeg',
			jpeg_quality: 90
		});
  Webcam.attach('#booth');

  // preload shutter audio clip
  var shutter = new Audio();
  shutter.autoplay = false;
  shutter.src = navigator.userAgent.match(/Firefox/) ? '/resources/shutter.ogg' : '/resources/shutter.mp3';

/*  document.getElementById('preview_snapshot').addEventListener('click', preview_snapshot);
  document.getElementById('cancel_preview').addEventListener('click', cancel_preview);
  document.getElementById('save_photo').addEventListener('click', save_photo);

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
	}*/

}

function checkCollectedStatus(newmemberid) {
  jquery.ajax({
    url: '/check',
    type: 'get',
    data: { id: newmemberid },
    dataType: 'json',
    success: function(rows) {
      if (!Array.isArray(rows)) {
        console.error('Unexpected state', rows);
        return;
      }
      if (rows.length === 0) {
        model.conflict = null;
      } else {
        model.conflict = rows[0];
      }
      applyState();
    },
    error: function() {
      console.log('check error', arguments);
    }
  });
}

function setupForm() {
  // document.getElementById('reset').addEventListener('click', resetForm);
  document.getElementById('collect').addEventListener('click', submit);
  findDeskName();

  function findDeskName() {
    jquery.ajax({
      url: '/deskname',
      type: 'get',
      success: function(deskname) {
        document.getElementById('deskname').innerHTML = deskname;
      },
      error: function() {
        console.log('check error', arguments);
      }
    });
  }

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
}

function isComplete() {
  return model.newmemberid /*&& model.photoready*/ && !model.conflict;
}

function applyState() {
  if (!model.newmemberid) {
    jquery('#bloodhound .typeahead').typeahead('val', '');
  }
  if (!model.proxyid) {
    jquery('#bloodhound2 .typeahead').typeahead('val', '');
  }
  // if (model.photoready) {
	// 	document.getElementById('pre_take_buttons').style.display = 'none';
	// 	document.getElementById('post_take_buttons').style.display = '';
  // } else {
  //   try{
  //     Webcam.unfreeze();
  //   } catch(x) {}
	// 	document.getElementById('pre_take_buttons').style.display = '';
	// 	document.getElementById('post_take_buttons').style.display = 'none';
  // }
  displayConflict();
  if (isComplete()) {
    jquery('#collect').prop('disabled', false);
  } else {
    jquery('#collect').prop('disabled', true);
  }
}

function resetForm() {
  try{
    Webcam.unfreeze();
  } catch(x) {}
  model.photo = null;
  model.newmemberid = null;
  model.photoready = false;
  model.proxyid = null;
  model.conflict = null;
  applyState();
  memberSearchInput.focus();
  memberSearchInput.select();
}


function displayConflict() {
  if (model.conflict) {
    document.getElementById('booth').style.display = 'none';
    document.getElementById('conflict').style.display = 'block';
    var full = members.get(model.conflict.newmemberid);
    if (model.conflict.membertype || model.conflict.mbrstatus) {
      // not eligible either because deceased or because infant or transfered out.
      var explanation = model.conflict.mbrstatus &&
              model.conflict.mbrstatus.toLowerCase().indexOf('deceased') !== -1 ?
        ' with status ' + model.conflict.mbrstatus :
        ' of type ' + model.conflict.membertype;
      document.getElementById('conflict').innerHTML =
  					'<div class="bg-danger">' +
            '<p class="lead">The member ' + full +
            explanation + ' is not eligible to vote.</p></div>';
      return;
    }
    var byproxy = ' - not by proxy';
    if (model.conflict.proxyid) {
      byproxy = ' - by proxy ' + (members.get(model.conflict.proxyid) || model.conflict.proxyid);
    }
    document.getElementById('conflict').innerHTML =
					'<div class="bg-danger">' +
          '<p class="lead">A voting slip was already collected for ' + full +
          ' at desk ' + model.conflict.desk + byproxy + '</p>' +
					'<img src="'+model.conflict.photo+'" width="320" height="240"/></div>';
  } else {
    document.getElementById('conflict').style.display = 'none';
    document.getElementById('booth').style.display = 'block';
  }
}

function updateProgress(progress) {
  var quorum = progress.quorum;
  var total = progress.total;
  var collected = progress.collected * 100 / total;
  var missing = quorum - collected;
  if (missing > 0) {
    document.getElementById('prog').title = progress.collected +
          ' collected slips out of ' + total + ' eligible members; \n' +
          'Quorum at ' + Math.floor(total*quorum/100) + ' votes.';
    document.getElementById('prog-collected').style.width = collected +"%";
    document.getElementById('prog-collected').class = "progress-bar";
    document.getElementById('prog-missing').style.width = missing +"%";
    document.getElementById('prog-missing').class = "progress-bar";
    document.getElementById('prog-missing').classList.add('progress-bar');
    document.getElementById('prog-missing').classList.add('progress-bar-warning');
    document.getElementById('prog-missing').classList.add('progress-bar-striped');
  } else {
    document.getElementById('prog').title = progress.collected +
          ' collected slips out of ' + total + ' eligible members; \n' +
          'Quorum at ' + Math.floor(total*quorum/100) + ' votes is reached.';
    document.getElementById('prog-collected').style.width = quorum + "%";
    document.getElementById('prog-collected').class = "progress-bar progress-bar-success";
    // prog-missing now means "extra votes after quorum has been reached."
    document.getElementById('prog-missing').style.width = (-missing)+ "%";
    document.getElementById('prog-missing').class = "progress-bar";
    document.getElementById('prog-missing').classList.add('progress-bar');
    document.getElementById('prog-missing').classList.add('progress-bar-success');
    document.getElementById('prog-missing').classList.add('progress-bar-striped');
  }
}

var doLogLostConnection = true;
function setupWs() {
  var ws;
  try {
    ws = new WebSocket("ws://"+location.hostname+(location.port ? ':'+location.port: '')+"/voting");
  } catch(x) {
    return reconnectIn4(x);
  }
  ws.onopen = function () {
    doLogLostConnection = true;
  };
  ws.onclose = reconnectIn4;
  ws.onmessage = function (evt) {
    // console.log('a msg', evt);
    var data;
    try {
      data = JSON.parse(evt.data);
    } catch(x) {
    }
    updateProgress(data);
  };
  ws.onerror = function (evt) {
    if (doLogLostConnection) {
      console.log("Websocket error: ", evt);
    }
  };
  function reconnectIn4(evt) {
    if (doLogLostConnection) {
      console.warn('Websocket connection lost. Reopening in 4 seconds', evt);
      doLogLostConnection = false;
    }
    setTimeout(setupWs, 4000);// connect again in 4 seconds
  }
}

fetchMembers();
setupSearches();
setupWebcam();
setupForm();
applyState();

setupWs();
