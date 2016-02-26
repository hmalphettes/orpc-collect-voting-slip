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
  document.getElementById('last-entry').innerHTML = ''
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
      if (res.update) {
        document.getElementById('last-entry').innerHTML = 'Last updated by ' +
          res.update.desk + ' on ' + new Date(res.update.timestamp).toString()
      }
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
      // place the cursor on the proper button:
      setTimeout(function () {
        if (validateNric(res.member.nric)) {
          if (model.nric === res.member.nric) {
            document.getElementById('nochange').focus()
          } else {
            document.getElementById('submitchanges').focus()
          }
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
  document.getElementById('reset').addEventListener('click', function () {
    document.getElementById('last-entry').innerHTML = ''
    resetForm()
  })
  document.getElementById('submitchanges').addEventListener('click', submitChange)
  document.getElementById('nochange').addEventListener('click', submitNoChange)
  utils.findDeskName()

  function _submit (nric) {
    console.log('_submit', model.newmemberid, members.get(model.newmemberid))
    if (!isComplete()) {
      applyState()
      return
    }
    jquery.ajax({
      url: '/update',
      type: 'post',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({
        newmemberid: model.newmemberid,
        nric: nric
      }),
      success: function () {
        // Great success! Displaying a small message below
        var full = members.get(model.newmemberid)
        document.getElementById('last-entry').innerHTML =
          '<p class="bg-success">Update of ' + full + ' was successfull.</p>'
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
  }

  function submitChange () {
    _submit(document.getElementById('editnric').value)
  }

  function submitNoChange () {
    _submit()
  }

  function isComplete () {
    const isComplete = model.newmemberid &&
      validateNric(document.getElementById('editnric').value)
    if (model.newmemberid) {
      document.getElementById('editnric').focus()
    } else {
      memberSearchInput.focus()
      memberSearchInput.select()
    }
    return isComplete
  }
}

function onchangeeditnric () {
  var editnricfg = document.getElementById('editnricfg')
  if (!model.newmemberid) {
    editnricfg.classList.remove('has-error')
    editnricfg.classList.remove('has-success')
    return
  }
  var editnric = document.getElementById('editnric')
  var val = utils.scanFin(editnric.value)
  if (val && val !== editnric.value) {
    editnric.value = val
  } else {
    val = editnric.value.toUpperCase()
  }
  var messagenric = document.getElementById('messagenric')
  if (!val) {
    editnricfg.classList.add('has-error')
    editnricfg.classList.remove('has-success')
    messagenric.textContent = 'Missing NRIC / FIN'
  } else if (validateNric(val)) {
    messagenric.textContent = 'All good'
    editnricfg.classList.remove('has-error')
    editnricfg.classList.add('has-success')
    if (val !== model.nric) {
      jquery('#nochange').prop('disabled', true)
      jquery('#submitchanges').prop('disabled', false)
    } else {
      jquery('#nochange').prop('disabled', false)
      jquery('#submitchanges').prop('disabled', true)
    }
  } else {
    messagenric.textContent = 'Invalid NRIC / FIN'
    editnricfg.classList.add('has-error')
    editnricfg.classList.remove('has-success')
    jquery('#nochange').prop('disabled', true)
    jquery('#submitchanges').prop('disabled', true)
  }
}

function applyState () {
  var editnric = document.getElementById('editnric')
  if (!model.newmemberid) {
    jquery('#bloodhound .typeahead').typeahead('val', '')
    editnric.setAttribute('disabled', '')
    jquery('#nochange').prop('disabled', true)
    jquery('#submitchanges').prop('disabled', true)
  } else {
    if (editnric.hasAttribute('disabled')) {
      editnric.removeAttribute('disabled')
    }
  }
  onchangeeditnric()
}

function resetForm () {
  model.update = null
  model.newmemberid = null
  document.getElementById('editnric').value = ''
  document.getElementById('messagenric').textContent = ''
  applyState()
  memberSearchInput.focus()
  memberSearchInput.select()
}

setupSearches()
setupForm()
applyState()

require('./collection-progress').setupWsProgress(true)
