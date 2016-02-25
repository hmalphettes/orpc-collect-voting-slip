'use strict'
const jquery = require('jquery')
const utils = require('./utils')

var memberSearchInput

const model = {
  newmemberid: null,
  proxyid: null,
  photo: null,
  photoready: false,
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
    editMemberData(datum.id)
  }).on('typeahead:autocomplete', function (ev, datum) {
    model.newmemberid = datum.id
    jquery('#bloodhound .typeahead').typeahead('val', members.get(datum.id))
    editMemberData(datum.id)
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
    var finMatch = memberSearchInput.value.match(/^([A-Z]\d{7}[A-Z])\d*$/)
    if (finMatch && finMatch[1]) {
      var mbId = nrics.get(finMatch[1])
      if (mbId) {
        setTimeout(function () {
          jquery('#bloodhound .typeahead').typeahead('val', members.get(mbId))
          if (model.newmemberid !== mbId) {
            model.newmemberid = mbId
            editMemberData(mbId)
          }
        }, 150) // queue for a little bit later because the funny reader will continue to type characters
      }
    }
  })[0]

  // place the cursor on the member input search:
  memberSearchInput.focus()
  memberSearchInput.select()
}

function editMemberData (newmemberid) {
  jquery.ajax({
    url: '/edit',
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
    return
  }
}

function applyState () {
}
function isComplete () {
}
function resetForm () {
}

setupSearches()
setupForm()
applyState()

// setupWs()
