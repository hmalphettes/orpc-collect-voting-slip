'use strict'
const jquery = require('jquery')
const utils = require('./utils')

const members = new Map() // newmemberid -> full
const nrics = new Map() // nric        ->  newmemberid

function setupSearches () {
  const searchableColumns = ['famname', 'firstname', 'middlename', 'preferredname', 'nric']
  const args = []

  for (let col of searchableColumns) {
    args.push({
      name: col,
      limit: 250,
      source: utils.constructSuggestions(col),
      display: function (datum) {
        return members.get(datum.id) + ' (' + col + ')'
      }
    })
  }
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
    var finMatch = memberSearchInput.value.match(/^([A-Z]\d{7}[A-Z])\d*$/)
    if (finMatch && finMatch[1]) {
      var mbId = nrics.get(finMatch[1])
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
  var proxyMemberSearchInput = jquery('#bloodhound2 .typeahead').typeahead({
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
    var finMatch = proxyMemberSearchInput.value.match(/^([A-Z]\d{7}[A-Z])\d*$/)
    if (finMatch && finMatch[1]) {
      var mbId = nrics.get(finMatch[1])
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



utils.fetchMembers(members)
utils.fetchNrics(nrics)
setupSearches()
setupForm()
applyState()

setupWs()
