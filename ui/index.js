'use strict';
const typeahead = require('typeahead');
const Bloodhound = typeahead.Bloodhound;
const jquery = require('jquery');
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

function setup() {
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

  jquery('#bloodhound .typeahead').typeahead({
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

setup();
