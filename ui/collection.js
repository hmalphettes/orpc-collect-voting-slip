'use strict';
// const utils = require('./utils');
const datatables = require('datatables');

// const members = new Map(); // newmemberid -> full
// const nrics   = new Map(); // nric        ->  newmemberid

const columns = [/*'orpcexcel.newmemberid', */ // columns from the orpcexcel table
  'famname', 'firstname', 'middlename',
  'preferredname', 'birthdate', 'nric', 'membertype', 'orpcexcel.mbrstatus',
  'proxyid', 'desk', 'timestamp', // columns from the voting table
  'vote_status' ]; // extra computed column
const birthdateIdx = columns.indexOf('birthdate');
const timestampIdx = columns.indexOf('timestamp');

// datatables('#members').DataTable( {
//   processing: true,
//   ajax: '/collection',
//   columns: columns
// });



datatables.ajax({
  url: '/collection',
  type: 'get',
  dataType: 'json',
  success: function(rows) {
    if (rows.data) {
      rows = rows.data;
    }
    if (!Array.isArray(rows)) {
      console.error('Unexpected state', rows);
      return;
    }
    for (var row of rows) {
      processRow(row);
    }
    datatables('#members').DataTable( {
      // processing: true,
      data: rows,
      columns: columns.map(function(c) {
        return { title: c };
      })
    });
  },
  error: function() {
    console.log('check error', arguments);
  }
});

/**
 * timestamp -> rendered as time.
 * birthdate -> rendered as date
 */
function processRow(row) {
  var b = row[birthdateIdx];
  if (b) {
    var bd = new Date(Date.parse(b));
    if (!isNaN(bd.valueOf())) {
      row[birthdateIdx] = bd.getFullYear() + '-' + pad(bd.getMonth()) + '-' + pad(bd.getDate());
    }
  }

  var t = row[timestampIdx];
  if (t) {
    var td = new Date(Date.parse(t));
    if (!isNaN(td.valueOf())) {
      row[timestampIdx] = pad(td.getHours()) + ':' + pad(td.getMinutes()) + ':' + pad(td.getSeconds());
    }
  }

}

function pad(numb) {
    return (numb < 10 ? '0' : '') + numb;
}
