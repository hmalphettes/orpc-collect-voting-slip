/**
 * Track the collected slips
 */

'use strict'
// var pg = require('pg')
// const conString = require('./searchable-datasets').conString
const pool = require('./searchable-datasets').pool
const _lazyCreateAttendanceTable = require('./searchable-datasets')._lazyCreateAttendanceTable
const tableName = require('./searchable-datasets').tableName

module.exports = {
  reset: reset, pcheck: pcheck, pcollect: pcollect, pcheckedit: pcheckedit, pupdate: pupdate, truncateNRIC: truncateNRIC,
}

/**
 * Check for a member if the voting slip has already been collected
 */
function pcheck (newmemberid) {
  return new Promise(function (accept, reject) {
    // get a pg client from the connection pool
    pool.getConnection(function (err, connection) {
      if (err) { return reject(err) }
      // Check that the member is not of type 'Infant Baptism' or 'Transfer Out':
      connection.query('SELECT newmemberid,membertype,mbrstatus FROM orpcexcel ' +
            'WHERE newmemberid=' + newmemberid, function (err, res) {
        if (err) {
          connection.release()
          return reject(err)
        }
        if (res && res[0]) {
          let mt = res[0].membertype ? res[0].membertype.toLowerCase() : ''
          if (mt.indexOf('infant') !== -1 || mt.indexOf('transfer out') !== -1) {
            connection.release()
            return accept(res)
          }
          let ms = res[0].mbrstatus ? res[0].mbrstatus.toLowerCase() : ''
          if (ms.indexOf('deceased') !== -1) {
            connection.release()
            return accept(res)
          }
        }
        // Check that there is not already a collected slip.
        connection.query('SELECT newmemberid,proxyid,desk,timestamp,photo FROM ' +
            tableName + ' WHERE newmemberid=' + newmemberid, function (err, res) {
          connection.release()
          if (err) { return reject(err) }
          accept(res)
        })
      })
    })
  })
}

/**
 * Check if a member has already updated his edited info.
 * retrieve the info of the last update, retrieve member's additional info
 */
function pcheckedit (newmemberid) {
  return new Promise(function (accept, reject) {
    // get a pg client from the connection pool
    pool.getConnection(function (err, connection) {
      if (err) { return reject(err) }
      // Check that the member is not of type 'Infant Baptism' or 'Transfer Out':
      connection.query('SELECT CAST(newmemberid as UNSIGNED) as newmemberid,famname,firstname,middlename,preferredname,birthdate,nric,mbrstatus,gender,maritalstatus FROM orpcexcel ' +
            'WHERE newmemberid=' + newmemberid, function (err, res) {
        if (err) {
          connection.release()
          return reject(err)
        }
        if (!res || !res[0]) {
          connection.release()
          return reject(new Error('Unable to find the member ' + newmemberid))
        }
        var member = res[0]
        // See if it has been updated already.
        connection.query('SELECT CAST(newmemberid as UNSIGNED) as newmemberid,proxyid,desk,timestamp FROM ' +
            tableName + ' WHERE newmemberid=' + newmemberid, function (err, res) {
          connection.release()
          if (err) { return reject(err) }
          accept({ member: member, update: res[0] })
        })
      })
    })
  })
}

function pcollect (desk, newmemberid, proxyid, photo) {
  return new Promise(function (accept, reject) {
    // get a mysql client from the connection pool
    pool.getConnection(function (err, connection) {
      if (err) { return reject(err) }
      // Get the member status so we can track extra members that should be added to the quorum.
      connection.query('SELECT newmemberid,mbrstatus FROM orpcexcel WHERE newmemberid=' + newmemberid, function (err, res) {
        if (err) {
          connection.release()
          return reject(err)
        }
        if (!res || !Array.isArray(res) || res.length !== 1) {
          connection.release()
          return reject(new Error('Could not find the member by his newmemberid: ' + newmemberid))
        }
        var mbrstatus = res[0].mbrstatus ? res[0].mbrstatus.toLowerCase() : ''
        const query = 'INSERT INTO ' + tableName + ' (newmemberid, proxyid, desk, photo, mbrstatus)' +
          'VALUES (' + newmemberid + ', ' + proxyid + ', \'' + desk + '\', \'' + photo + '\', \'' + mbrstatus + '\')'
        connection.query(query, function (err /*, res*/) {
          connection.release()
          if (err) { return reject(err) }
          accept()
        })
      })
    })
  })
}

// X1111272J -> 272J
function pupdate (desk, newmemberid, nric) {
  return new Promise(function (accept, reject) {
    if (!newmemberid) { reject(new Error('Missing newmemberid')) }
    // get a mysql client from the connection pool
    pool.getConnection(function (err, connection) {
      if (err) { return reject(err) }
      // Get the member status so we can track extra members that should be added to the quorum.
      connection.query('SELECT newmemberid,mbrstatus FROM orpcexcel WHERE newmemberid=' + newmemberid, function (err, res) {
        if (err) {
          connection.release()
          return reject(err)
        }
        if (!res || !Array.isArray(res) || res.length !== 1) {
          connection.release()
          return reject(new Error('Could not find the member by his newmemberid: ' + newmemberid))
        }
        const query = 'INSERT INTO ' + tableName + ' (newmemberid, desk) ' +
          'VALUES (' + newmemberid + ', \'' + desk + '\') ON DUPLICATE KEY UPDATE ' +
          'desk = VALUES(desk), timestamp = VALUES(timestamp)'
        connection.query(query, function (err /*, res*/) {
          if (err) {
            connection.release()
            return reject(err)
          }
          if (!nric) {
            // Nothing to update, and that is fine
            connection.release()
            return accept()
          }
          var updateNric = 'UPDATE orpcexcel' +
                ' SET LastModified=now()' +
                ', Modifiedby=\'' + desk + '\''
          if (nric) {
            updateNric += ', nric=\'' + nric + '\''
          }
          updateNric += ' WHERE newmemberid=' + newmemberid
          connection.query(updateNric, function (err /*, res*/) {
            connection.release()
            if (err) { return reject(err) }
            accept()
          })
        })
      })
    })
  })
}

function reset (done) {
  pool.getConnection(function (err, connection) {
    if (err) { return done(err) }
    connection.query('DROP TABLE IF EXISTS ' + tableName, function (err) {
      if (err) {
        connection.release()
        return done(err)
      }
      _lazyCreateAttendanceTable(connection, tableName, function (err, res) {
        connection.release()
        done(err, res)
      })
    })
  })
}
