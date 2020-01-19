'use strict'
const jquery = require('jquery')
const typeahead = require('typeahead')
const Bloodhound = typeahead.Bloodhound

const members = new Map() // newmemberid -> full
const nrics = new Map() // nric        ->  newmemberid
var _membersInitialised = false
var _nricsInitialised = false

module.exports = {
  fetchMembers, fetchNrics, constructSuggestions, createSuggestions, findDeskName, scanFin
}

function fetchMembers (done) {
  if (_membersInitialised) {
    done && done(null, members)
    return members
  }
  _membersInitialised = true
  jquery.ajax({
    url: '/newmemberid',
    type: 'get',
    dataType: 'json',
    success: function (rows) {
      if (!Array.isArray(rows)) {
        console.error('Unexpected state', rows)
        return
      }
      for (var row of rows) {
        members.set(row.id, row.value.replace(/\s\s+/g, ' '))
      }
      done && done(null, members)
    },
    error: function (err) {
      console.log('check error', arguments)
      done && done(err)
    }
  })
  return members
}

function fetchNrics (done) {
  if (_nricsInitialised) {
    done && done(null, nrics)
    return nrics
  }
  _nricsInitialised = true
  jquery.ajax({
    url: '/nric',
    type: 'get',
    dataType: 'json',
    success: function (rows) {
      if (!Array.isArray(rows)) {
        console.error('Unexpected state', rows)
        return
      }
      for (var row of rows) {
        var ids = nrics.get(row.value)
        if (!ids) {
          ids = [row.id]
          nrics.set(row.value, ids)
        } else {
          ids.push(row.id)
        }
      }
      done && done(null, nrics)
    },
    error: function (err) {
      console.log('check error', arguments)
      done && done(err)
    }
  })
  return nrics
}

function constructSuggestions (col) {
  return new Bloodhound({
    datumTokenizer: function (datum) {
      return Bloodhound.tokenizers.whitespace(datum.value)
    },
    queryTokenizer: function (query) {
      if (query) {
        var finHint = scanFin(query)
        if (!finHint) {
          finHint = scanFinPartialFromStart(query)
        }
        if (finHint) {
          return Bloodhound.tokenizers.whitespace(finHint)
        }
      }
      return Bloodhound.tokenizers.whitespace(query)
    },
    identify: function midentify (obj) {
      return obj.id
    },
    prefetch: {
      url: '/' + col,
      cache: false
    }
  })
}

function createSuggestions () {
  const searchableColumns = ['famname', 'firstname', 'middlename', 'preferredname', 'nric']
  const args = []

  for (let col of searchableColumns) {
    args.push({
      name: col,
      limit: 250,
      source: constructSuggestions(col),
      display: function (datum) {
        return members.get(datum.id) + ' (' + col + ')'
      }
    })
  }
  return args
}

function findDeskName () {
  jquery.ajax({
    url: '/deskname',
    type: 'get',
    success: function (deskname) {
      document.getElementById('deskname').innerHTML = deskname
    },
    error: function () {
      console.log('check error', arguments)
    }
  })
}

/**
When a scanner inputs a FIN there can be all kind of digits after the
the fin number. Trim them out.
Also tolerate lower case and return the upper case fin.

Then truncate to the last 4 digits
 */
function scanFin(value) {
  // full FIN when coming from the scanner
  var finMatch = value.match(/^([A-Z]?\d{7}[A-Z])\d*/i)
  if (finMatch && finMatch[1]) {
    var fullFin = finMatch[1].toUpperCase()
    return fullFin.slice(-4)
  }
  var smallFinMatch = value.match(/^(\d{3}[A-Z])\d*/i)
  return smallFinMatch && smallFinMatch[1] ? smallFinMatch[1].toUpperCase() : null
}

function scanFinPartialFromStart(value) {
  // if someone was to type an NRIC letter by letter.
  // this will match the last significant characters
  var finMatch = value.match(/^^[A-Z]?\d{1,4}(\d*[a-zA-Z]?)$/i)
  if (finMatch && finMatch[1]) {
    var fullFin = finMatch[1].toUpperCase()
    return fullFin.slice(-4)
  }
  return null
}
