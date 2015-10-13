'use strict';
const pg = require('pg');
// const conString = "postgres://username:password@localhost/database";
const conString = "postgres://localhost/orpc";
const client = new pg.Client(conString);

const full = "concat_ws(' ', famname, firstname, middlename, preferredname, birthdate, nric)";
function makeQuery(columnToSearch) {
  return 'SELECT newmemberid as id, '+columnToSearch+' AS value, '+full+' AS full FROM orpcexcel';
}

/**
 * Returns datasets in a format that can be processed by typeahead's bloodhound.
 */
function getDatasets(searchableColumns, done) {
  var idx = -1;
  const datasets = [];
  client.connect(function(err) {
    if(err) { return done(err); }
    fetchOne();
  });

  function fetchOne() {
    idx++;
    var col = searchableColumns[idx];
    if (!col) {
      client.end();
      return setImmediate(() => done(null, datasets));
    }
    fetchSearchableRows(client, col, function(err, res) {
      if (err) {
        client.end();
        return done(err);
      }
      datasets.push(res);
      setImmediate(fetchOne);
    });
  }
}

function fetchSearchableRows(client, columnToSearch, done) {
  const query = makeQuery(columnToSearch);
  // console.log(query);
  client.query(query, function(err, res) {
    // console.log('-->', err, res);
    if (err) { return done(err); }
    done(null, res.rows);
  });
}

module.exports = { getDatasets };
