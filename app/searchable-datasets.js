'use strict';

const mysql = require('mysql');
const pool  = mysql.createPool({
  connectionLimit : 10,
  host     : 'localhost',
  user     : 'root',
  password : undefined,
  database : 'orpc'
});
const tableName = 'votingslip';

const full = "concat_ws(' ', famname, firstname, middlename, preferredname, birthdate, nric, oldmstatus)";
function makeQuery(columnToSearch) {
  var searched = columnToSearch !== 'newmemberid' ? columnToSearch : full;
  return 'SELECT newmemberid as id, ' + searched +' AS value FROM orpcexcel';
}


/**
 * Returns datasets in a format that can be processed by typeahead's bloodhound.
 */
function getDatasets(searchableColumns, done) {
  var idx = -1;
  const datasets = [];
  var connection;
  pool.getConnection(function(err, _connection) {
    if(err) { return done(err); }
    connection = _connection;
    _lazyCreate(connection, tableName, fetchOne);
  });

  function fetchOne() {
    idx++;
    var col = searchableColumns[idx];
    if (!col) {
      connection.release();
      return setImmediate(function() { done(null, datasets); });
    }
    fetchSearchableRows(connection, col, function(err, res) {
      if (err) {
        connection.release();
        return done(err);
      }
      datasets.push(res);
      setImmediate(fetchOne);
    });
  }
}

function fetchSearchableRows(connection, columnToSearch, done) {
  const query = makeQuery(columnToSearch);
  // console.log(query);
  connection.query(query, function(err, res) {
    // console.log('-->', err, res);
    if (err) { return done(err); }
    done(null, res);
  });
}

function _lazyCreate(connection, tableName, done) {
  connection.query('CREATE TABLE IF NOT EXISTS ' + tableName + ' (newmemberid integer PRIMARY KEY,'+
    ' proxyid integer, timestamp timestamp default current_timestamp, '+
    'desk character varying(64), photo LONGTEXT)', function (err, res) {
    done(err, res);
  });
}

module.exports = { getDatasets: getDatasets, /*conString: conString,*/ pool: pool, _lazyCreate: _lazyCreate, tableName: tableName };
