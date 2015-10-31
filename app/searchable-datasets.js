'use strict';

const mysql = require('mysql');
const pool  = mysql.createPool({
  connectionLimit : 10,
  host     : process.env.MYSQL_HOST     || 'localhost',
  user     : process.env.MYSQL_USER     || 'root',
  password : process.env.MYSQL_PASSWORD || undefined,
  database : process.env.MYSQL_DATABASE || 'orpc'
});

// Name of the database table where the attendance is recorded.
const tableName = process.env.MYSQL_VOTING_SESSION_TABLE || 'votingslip';

const full = "concat_ws(' ', famname, firstname, middlename, preferredname, birthdate, nric, mbrstatus)";
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
  var quorum;
  pool.getConnection(function(err, _connection) {
    if(err) { return done(err); }
    connection = _connection;
    _lazyCreateAttendanceTable(connection, tableName, function() {
      _countBaseQuorum(connection, function(err, _quorum) {
        if (err) {
          connection.release();
          return done(err);
        }
        quorum = _quorum;
        fetchOne();
      });
    });
  });

  function fetchOne() {
    idx++;
    var col = searchableColumns[idx];
    if (!col) {
      connection.release();
      return setImmediate(function() { done(null, datasets, quorum); });
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

function _lazyCreateAttendanceTable(connection, tableName, done) {
  connection.query('CREATE TABLE IF NOT EXISTS ' + tableName + ' (newmemberid integer PRIMARY KEY,'+
  ' proxyid INTEGER, timestamp TIMESTAMP default current_timestamp, '+
  'desk VARCHAR(64), photo LONGTEXT, mbrstatus VARCHAR(80))', function (err, res) {
    done(err, res);
  });
}

/**
 * Count the number of active members.
 * We will need to the members that although Inactive actually ended up voting.
 */
function _countBaseQuorum(connection, done) {
  connection.query("SELECT COUNT(*) FROM orpcexcel WHERE MbrStatus = 'Active'", function(err, res) {
    if (res && Array.isArray(res) && res.length === 1) {
      return done(null, _extractCountResult(res));
    }
    return done(err || new Error('Unexpected result'));
  });
}

/**
 * - Count the number of members who collected a slip.
 * - Count the number of members who collected a slip and are not marked as 'Active' so we can add them to the base quorum.
 */
function countCollectionsAndExtraQuorum(done) {
  pool.getConnection(function(err, connection) {
    if(err) { return done(err); }
    connection.query("SELECT COUNT(*) FROM "+tableName+" WHERE NOT MbrStatus = 'Active'", function(err, res) {
      if (res && Array.isArray(res) && res.length === 1) {
        var nonActiveMembersVotingCount = _extractCountResult(res);
        return connection.query("SELECT COUNT(*) FROM "+tableName, function(err, res) {
          var collectedCount = _extractCountResult(res);
          connection.release();
          return done(null, collectedCount, nonActiveMembersVotingCount);
        });
      }
      connection.release();
      return done(err || new Error('Unexpected result'));
    });
  });
}

function _extractCountResult(res) {
  if (res && Array.isArray(res) && res.length === 1) {
    for (var k in res[0]) {
      if (k.toLowerCase().indexOf('count') !== -1) {
        return res[0][k];
      }
    }
    return console.error('Could not read the result of the COUNT in ' + JSON.stringify(res));
  }
}

module.exports = {
  tableName: tableName,
  getDatasets: getDatasets,
  pool: pool,
  _lazyCreateAttendanceTable: _lazyCreateAttendanceTable,
  countCollectionsAndExtraQuorum: countCollectionsAndExtraQuorum
};
