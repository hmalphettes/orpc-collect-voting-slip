'use strict';
const jquery = require('jquery');

module.exports = {
  fetchMembers, fetchNrics
};

function fetchMembers(members, done) {
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
      done && done(null, members);
    },
    error: function(err) {
      console.log('check error', arguments);
      done && done(err);
    }
  });
}

function fetchNrics(nrics, done) {
  jquery.ajax({
    url: '/nric',
    type: 'get',
    dataType: 'json',
    success: function(rows) {
      if (!Array.isArray(rows)) {
        console.error('Unexpected state', rows);
        return;
      }
      for (var row of rows) {
        nrics.set(row.value, row.id);
      }
      done && done(null, nrics);
    },
    error: function(err) {
      console.log('check error', arguments);
      done && done(err);
    }
  });
}
