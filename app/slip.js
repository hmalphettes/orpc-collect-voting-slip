/**
 * Track the collected slips
 */

'use strict';
var pg = require('pg');
const conString = require('./searchable-datasets').conString;
const tableName = 'votingslip';

module.exports = {reset: reset, pcheck: pcheck, pcollect: pcollect};

function pcheck(newmemberid) {
  return new Promise(function(accept, reject) {
    // get a pg client from the connection pool
    pg.connect(conString, function(err, client, end) {
      if(err) { return reject(err); }
      client.query('SELECT newmemberid,proxyid,desk,timestamp,photo FROM '+tableName+' WHERE newmemberid='+newmemberid, function(err, res) {
        end(); // release the client back to the pool
        if (err) { return reject(err); }
        accept(res.rows);
      });
    });
  });
}

function pcollect(newmemberid, proxyid, desk, photo) {
  return new Promise(function(accept, reject) {
    // get a pg client from the connection pool
    pg.connect(conString, function(err, client, end) {
      if(err) { return reject(err); }
      const query = "INSERT INTO " + tableName + " (newmemberid, proxyid, desk, photo)" +
                  "VALUES (" + newmemberid + ", " + proxyid + ", " +
                           "'" + desk + "', '" + photo + "')";
      client.query(query, function (err /*, res*/) {
        end();
        if (err) { return reject(err); }
        accept();
      });
    });
  });
}

function reset(done) {
  pg.connect(conString, function(err, client, end) {
    if(err) { return done(err); }
    client.query('DROP TABLE ' + tableName, function(/*err, res*/) {
      // disregard the error when the table could not be found
      // console.log(err, res);
      client.query('CREATE TABLE ' + tableName + ' (newmemberid integer PRIMARY KEY,'+
        ' proxyid integer, '+
        'timestamp timestamp default current_timestamp, '+
        'desk character varying(64), photo text)', function (err, res) {
        end();
        done(err, res);
      });
    });
  });
}
