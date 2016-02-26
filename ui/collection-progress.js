'use strict'
module.exports = {
  setupWsProgress
}

/**
 * Progress of voting slip collection
 */
function updateVotingProgress (progress) {
  var quorum = progress.quorum
  var total = progress.total
  var collected = progress.collected * 100 / total
  var missing = quorum - collected
  if (missing > 0) {
    document.getElementById('prog').title = progress.collected +
          ' collected slips out of ' + total + ' eligible members \n' +
          'Quorum at ' + Math.ceil(total * quorum / 100) + ' votes.'
    document.getElementById('prog-collected').style.width = collected + '%'
    document.getElementById('prog-collected').class = 'progress-bar'
    document.getElementById('prog-missing').style.width = missing + '%'
    document.getElementById('prog-missing').class = 'progress-bar'
    document.getElementById('prog-missing').classList.add('progress-bar')
    document.getElementById('prog-missing').classList.add('progress-bar-warning')
    document.getElementById('prog-missing').classList.add('progress-bar-striped')
  } else {
    document.getElementById('prog').title = progress.collected +
          ' collected slips out of ' + total + ' eligible members; \n' +
          'Quorum at ' + Math.ceil(total * quorum / 100) + ' votes is reached.'
    document.getElementById('prog-collected').style.width = quorum + '%'
    // document.getElementById('prog-collected').class = "progress-bar-success"
    document.getElementById('prog-collected').classList.remove('progress-bar-warning')
    document.getElementById('prog-collected').classList.add('progress-bar-success')
    // prog-missing now means "extra votes after quorum has been reached."
    document.getElementById('prog-missing').style.width = -missing + '%'
    document.getElementById('prog-missing').class = 'progress-bar'
    document.getElementById('prog-missing').classList.add('progress-bar')
    document.getElementById('prog-missing').classList.remove('progress-bar-warning')
    // document.getElementById('prog-missing').classList.add('progress-bar-success')
    document.getElementById('prog-missing').classList.remove('progress-bar-striped')
  }
}

/**
 * Progress of updating the members list
 */
function updateEditProgress (progress) {
  var total = progress.total
  var quorum = 0
  var missing = 0
  document.getElementById('prog').title = progress.collected +
        ' updated out of ' + total + ' members.'
  document.getElementById('prog-collected').style.width = quorum + '%'
  // document.getElementById('prog-collected').class = "progress-bar-success"
  document.getElementById('prog-collected').classList.remove('progress-bar-warning')
  document.getElementById('prog-collected').classList.add('progress-bar-success')
  // prog-missing now means "extra votes after quorum has been reached."
  document.getElementById('prog-missing').style.width = -missing + '%'
  document.getElementById('prog-missing').class = 'progress-bar'
  document.getElementById('prog-missing').classList.add('progress-bar')
  document.getElementById('prog-missing').classList.remove('progress-bar-warning')
  // document.getElementById('prog-missing').classList.add('progress-bar-success')
  document.getElementById('prog-missing').classList.remove('progress-bar-striped')
}

/* global WebSocket */
var doLogLostConnection = true
var isEdit = false
function setupWsProgress (_isEdit) {
  if (_isEdit) { isEdit = true }
  const updateProgress = isEdit ? updateEditProgress : updateVotingProgress
  var ws
  try {
    ws = new WebSocket('ws://' + window.location.hostname + (window.location.port ? ':' + window.location.port : '') + '/voting')
  } catch (x) {
    return reconnectIn4(x)
  }
  ws.onopen = function () {
    doLogLostConnection = true
  }
  ws.onclose = reconnectIn4
  ws.onmessage = function (evt) {
    // console.log('a msg', evt)
    var data
    try {
      data = JSON.parse(evt.data)
    } catch (x) {
    }
    updateProgress(data)
  }
  ws.onerror = function (evt) {
    if (doLogLostConnection) {
      console.log('Websocket error: ', evt)
    }
  }
  function reconnectIn4 (evt) {
    if (doLogLostConnection) {
      console.warn('Websocket connection lost. Reopening in 4 seconds', evt)
      doLogLostConnection = false
    }
    setTimeout(setupWsProgress, 4000) // connect again in 4 seconds
  }
}
