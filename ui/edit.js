'use strict'
const jquery = require('jquery')
const utils = require('./utils')
const validateNric = require('./nric').validate

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
    var fin = utils.scanFin(memberSearchInput.value)
    if (fin) {
      var mbId = nrics.get(fin)
      if (mbId) {
        setTimeout(function () {
          jquery('#bloodhound .typeahead').typeahead('val', members.get(mbId))
          if (model.newmemberid !== mbId) {
            model.newmemberid = mbId
            editMemberData(mbId, true)
          }
        }, 150) // queue for a little bit later because the funny reader will continue to type characters
      }
    }
  })[0]

  // place the cursor on the member input search:
  memberSearchInput.focus()
  memberSearchInput.select()
}

function editMemberData (newmemberid, foundViaNric) {
  jquery.ajax({
    url: '/checkedit',
    type: 'get',
    data: { id: newmemberid },
    dataType: 'json',
    success: function (res) {
      if (!res.member) {
        console.error('Unexpected state', res)
        return
      }
      model.newmemberid = res.member.newmemberid
      model.update = res.update
      res.member.nric = res.member.nric || ''
      model.nric = res.member.nric
      res.member.nric = res.member.nric.toUpperCase()
      if (res.member.nric.match(/^[\d]/) && validateNric('S' + res.member.nric)) {
        // sometimes a FIN is entered only as numbers and lack the prefix 'S'.
        // fix it here once we check that the only thing missing is the prefix:
        res.member.nric = 'S' + res.member.nric
      }
      document.getElementById('editnric').value = res.member.nric
      onchangeeditnric()
      // place the cursor on the collect button:
      setTimeout(function () {
        if (foundViaNric && validateNric(res.member.newmemberid)) {
          document.getElementById('nochange').focus()
        } else {
          document.getElementById('editnric').focus()
        }
      }, 100)
      applyState()
    },
    error: function () {
      console.log('check error', arguments)
    }
  })
}

function setupForm () {
  jquery('#editnric').on('input', onchangeeditnric)
  jquery('#editnric').on('keyup', function () {
    var editnric = document.getElementById('editnric')
    var upperCased = editnric.value.toUpperCase()
    if (upperCased !== editnric.value) {
      editnric.value = upperCased
    }
    // Trim the extra characters after the fin value that the scanner might have entered
    var fin = utils.scanFin(editnric.value)
    if (fin && editnric.value !== fin) {
      editnric.value = fin
    }
  })
  document.getElementById('reset').addEventListener('click', resetForm)
  document.getElementById('edit').addEventListener('click', submit)
  document.getElementById('nochange').addEventListener('click', submitnochange)
  utils.findDeskName()

  function submit () {
    if (!isComplete()) {
      applyState()
      return
    }
    return
  }

  function submitnochange () {
    // TODO: check NRIC is known and valid.
  }
}

function onchangeeditnric () {
  var editnric = document.getElementById('editnric')
  var val = editnric.value.toUpperCase()
  if (val !== editnric.value) {
    editnric.value = val
  }
  var editnricfg = document.getElementById('editnricfg')
  var messagenric = document.getElementById('messagenric')
  if (!val) {
    editnricfg.classList.remove('has-error')
    editnricfg.classList.remove('has-success')
    messagenric.textContent = 'Missing NRIC / FIN'
  } else if (validateNric(val)) {
    messagenric.textContent = ''
    editnricfg.classList.remove('has-error')
    editnricfg.classList.add('has-success')
    if (val !== model.nric) {
      jquery('#nochange').prop('disabled', true)
      jquery('#edit').prop('disabled', false)
    } else {
      jquery('#nochange').prop('disabled', false)
      jquery('#edit').prop('disabled', true)
    }
  } else {
    messagenric.textContent = 'Invalid NRIC / FIN'
    editnricfg.classList.add('has-error')
    editnricfg.classList.remove('has-success')
    jquery('#nochange').prop('disabled', true)
    jquery('#edit').prop('disabled', true)
  }
}

function applyState () {
  var editnric = document.getElementById('editnric')
  if (!model.newmemberid) {
    jquery('#bloodhound .typeahead').typeahead('val', '')
    editnric.setAttribute('disabled', '')
    jquery('#nochange').prop('disabled', true)
    jquery('#edit').prop('disabled', true)
  } else {
    if (editnric.hasAttribute('disabled')) {
      editnric.removeAttribute('disabled')
    }
  }
  onchangeeditnric()
}
function isComplete () {
}
function resetForm () {
  model.update = null
  model.newmemberid = null
  document.getElementById('editnric').value = ''
  applyState()
  memberSearchInput.focus()
  memberSearchInput.select()
}

setupSearches()
setupForm()
applyState()

// setupWs()
