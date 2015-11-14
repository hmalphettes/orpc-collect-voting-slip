'use strict';
const datatables = require('datatables');

// const members = new Map(); // newmemberid -> full
// const nrics   = new Map(); // nric        ->  newmemberid

const columns = [/*'orpcexcel.newmemberid', */ // columns from the orpcexcel table
  'famname', 'firstname', 'middlename',
  'preferredname', 'birthdate', 'nric', 'membertype', 'orpcexcel.mbrstatus',
  'proxyid', 'desk', 'timestamp', // columns from the voting table
  'vote_status' ]; // extra computed column

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
    // for (var row of rows) {
    //   processRow(row);
    // }
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
