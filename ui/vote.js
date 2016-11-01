'use strict'
const jquery = require('jquery')
const utils = require('./utils')
// const Webcam = require('webcamjs')

var memberSearchInput

const model = {
  newmemberid: null,
  proxyid: null,
  // photo: null,
  // photoready: false,
  conflict: null
}

const members = utils.fetchMembers()
const nrics = utils.fetchNrics()

function setupSearches () {
  const args = utils.createSuggestions()

  // Setup member search
  memberSearchInput = jquery('#bloodhound .typeahead').typeahead({
    hint: true,
    highlight: true,
    minLength: 1
  }, args).on('typeahead:select', function (ev, datum) {
    model.newmemberid = datum.id
    jquery('#bloodhound .typeahead').typeahead('val', members.get(datum.id))
    checkCollectedStatus(datum.id)
  }).on('typeahead:autocomplete', function (ev, datum) {
    model.newmemberid = datum.id
    jquery('#bloodhound .typeahead').typeahead('val', members.get(datum.id))
    checkCollectedStatus(datum.id)
  }).on('keyup', function (ev) { // jshint ignore:line
    if (model.conflict) {
      var fullConflit = members.get(model.conflict.newmemberid)
      if (fullConflit !== memberSearchInput.value && !memberSearchInput.value.startsWith(fullConflit)) {
        resetForm()
        return
      }
    }
    // if (ev.keyCode === 13) { // the new model of scanner does not type 13 or anything.
    // carriage return. check barcode reader's input: the fin concatenated with a ddmmyy. no ddmmyy for citizens
    var fin = utils.scanFin(memberSearchInput.value)
    if (fin) {
      var mbId = nrics.get(fin)
      if (mbId) {
        setTimeout(function () {
          jquery('#bloodhound .typeahead').typeahead('val', members.get(mbId))
          if (model.newmemberid !== mbId) {
            model.newmemberid = mbId
            checkCollectedStatus(mbId)
          }
        }, 150) // queue for a little bit later because the funny reader will continue to type characters
      }
    }
  })[0]

  // Setup proxy search
  jquery('#bloodhound2 .typeahead').typeahead({
    hint: true,
    highlight: true,
    minLength: 1
  }, args).on('typeahead:select', function (ev, datum) {
    model.proxyid = datum.id
    jquery('#bloodhound2 .typeahead').typeahead('val', members.get(datum.id))
    if (model.newmemberid) {
      checkCollectedStatus(model.newmemberid)
    }
  }).on('typeahead:autocomplete', function (ev, datum) {
    model.proxyid = datum.id
    jquery('#bloodhound2 .typeahead').typeahead('val', members.get(datum.id))
    if (model.newmemberid) {
      checkCollectedStatus(model.newmemberid)
    }
  }).on('keyup', function (/* ev */) {
    // if (ev.keyCode === 13) {
    // the new model of scanner does not type 13 or anything.
    // carriage return. check barcode reader's input: the fin concatenated with a ddmmyy. no ddmmyy for citizens
    var fin = utils.scanFin(memberSearchInput.value)
    if (fin) {
      var mbId = nrics.get(fin)
      if (mbId) {
        model.proxyid = mbId
        setTimeout(function () {
          jquery('#bloodhound2 .typeahead').typeahead('val', members.get(mbId))
          if (model.newmemberid) {
            checkCollectedStatus(model.newmemberid)
          }
        }, 150) // queue for a little bit later because the funny reader will continue to type characters
      }
    }
  })[0]

  // place the cursor on the member input search:
  memberSearchInput.focus()
  memberSearchInput.select()
}
/* github:jhuckaby/webcamjs@^1.0.6
const shutter = new window.Audio()
function setupWebcam () {
  // Setup webcam booth
  Webcam.set({
    width: 320,
    height: 240,
    dest_width: 320,
    dest_height: 240,
    image_format: 'jpeg',
    jpeg_quality: 90,
    force_flash: true // otherwise we need to run on https since chrome 47
  })
  Webcam.attach('#booth')
  // preload shutter audio clip
  shutter.autoplay = false
  shutter.src = navigator.userAgent.match(/Firefox/) ? '/resources/shutter.ogg' : '/resources/shutter.mp3'

  document.getElementById('preview_snapshot').addEventListener('click', preview_snapshot)
  document.getElementById('cancel_preview').addEventListener('click', cancel_preview)
  document.getElementById('save_photo').addEventListener('click', save_photo)

  function preview_snapshot() {
    console.log('preview_snapshot')
  	// play sound effect
  	shutter.play()
		// freeze camera so user can preview pic
		Webcam.freeze()
    model.photoready = true
    applyState()
	}
	function cancel_preview() {
		// cancel preview freeze and return to live camera feed
		Webcam.unfreeze()
    model.photoready = false

    applyState()
	}
}*/

function checkCollectedStatus (newmemberid) {
  jquery.ajax({
    url: '/check',
    type: 'get',
    data: { id: newmemberid },
    dataType: 'json',
    success: function (rows) {
      if (!Array.isArray(rows)) {
        console.error('Unexpected state', rows)
        return
      }
      if (rows.length === 0) {
        model.conflict = null
        // place the cursor on the collect button:
        setTimeout(function () {
          document.getElementById('collect').focus()
        }, 100)
      } else {
        model.conflict = rows[0]
      }
      applyState()
    },
    error: function () {
      console.log('check error', arguments)
    }
  })
}

function setupForm () {
  // document.getElementById('reset').addEventListener('click', resetForm)
  document.getElementById('collect').addEventListener('click', submit)
  utils.findDeskName()

  function submit () {
    if (!isComplete()) {
      applyState()
      return
    }
    // Webcam.snap(function (data_uri) {
    //   shutter.play()
    //   model.photo = data_uri
    jquery.ajax({
      url: '/collect',
      type: 'post',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({
        newmemberid: model.newmemberid,
        proxyid: model.proxyid
        // photo: data_uri
      }),
      success: function () {
        // Great success! Displaying a small message below
        var full = members.get(model.newmemberid)
        document.getElementById('last-entry').innerHTML =
          '<p class="bg-success">Registration of ' + full + ' was successfull.</p>'
        setTimeout(function () {
          document.getElementById('last-entry').innerHTML = ''
        }, 8000)
        resetForm()
      },
      error: function () {
        var full = members.get(model.newmemberid)
        document.getElementById('last-entry').innerHTML =
          '<p class="bg-danger">Registration of ' + full + ' was not successfull.</p>'
        setTimeout(function () {
          document.getElementById('last-entry').innerHTML = ''
        }, 25000)
        console.log('check error', arguments)
      }
    })
    // })
  }
}

function isComplete () {
  return model.newmemberid /* && model.photoready */ && !model.conflict
}

function applyState () {
  if (!model.newmemberid) {
    jquery('#bloodhound .typeahead').typeahead('val', '')
  }
  if (!model.proxyid) {
    jquery('#bloodhound2 .typeahead').typeahead('val', '')
  }
  // if (model.photoready) {
	// 	document.getElementById('pre_take_buttons').style.display = 'none'
	// 	document.getElementById('post_take_buttons').style.display = ''
  // } else {
  //   try{
  //     Webcam.unfreeze()
  //   } catch(x) {}
	// 	document.getElementById('pre_take_buttons').style.display = ''
	// 	document.getElementById('post_take_buttons').style.display = 'none'
  // }
  displayConflict()
  if (isComplete()) {
    jquery('#collect').prop('disabled', false)
  } else {
    jquery('#collect').prop('disabled', true)
  }
}

function resetForm () {
  // try {
  //   Webcam.unfreeze()
  // } catch (x) {}
  model.photo = null
  model.newmemberid = null
  // model.photoready = false
  model.proxyid = null
  model.conflict = null
  applyState()
  memberSearchInput.focus()
  memberSearchInput.select()
}

function displayConflict () {
  if (model.conflict) {
    // document.getElementById('booth').style.display = 'none'
    document.getElementById('conflict').style.display = 'block'
    var full = members.get(model.conflict.newmemberid) || 'Unknown member ' + model.conflict.newmemberid
    if (model.conflict.membertype || model.conflict.mbrstatus) {
      // not eligible either because deceased or because infant or transfered out.
      var explanation = model.conflict.mbrstatus &&
              model.conflict.mbrstatus.toLowerCase().indexOf('deceased') !== -1
        ? ' with status ' + model.conflict.mbrstatus
        : ' of type ' + model.conflict.membertype
      document.getElementById('conflict').innerHTML = '<div class="bg-danger">' +
        '<p class="lead">The member ' + full + explanation + ' is not eligible to vote.</p></div>'
      return
    }
    var byproxy = ' - not by proxy'
    if (model.conflict.proxyid) {
      byproxy = ' - by proxy ' + (members.get(model.conflict.proxyid) || model.conflict.proxyid)
    }
    document.getElementById('conflict').innerHTML =
					'<div class="bg-danger">' +
          '<p class="lead">A voting slip was already collected for ' + full +
          ' at desk ' + model.conflict.desk + byproxy + '</p>'/* +
					'<img src="' + model.conflict.photo + '" width="320" height="240"/></div>'*/
  } else {
    document.getElementById('conflict').style.display = 'none'
    // document.getElementById('booth').style.display = 'block'
  }
}

setupSearches()
// setupWebcam()
setupForm()
applyState()

require('./collection-progress').setupWsProgress()
