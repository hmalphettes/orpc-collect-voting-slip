/**
 * Parallel random collecting slips.
 * Feel free to use the server while this is happening.
 *
 * Special server config: no auth: `DISABLE_AUTH=1 npm start`
 */
'use strict'
var Promise = require('bluebird') // jshint ignore: line
var request = require('request-promise')
var datasets = require('./searchable-datasets')
var shuffle = require('knuth-shuffle').knuthShuffle

var serverUrl = process.env.VOTING_BASE_URL || 'http://localhost:1999'
var workers = process.env.DESKS_NUMBER ? parseInt(process.env.DESKS_NUMBER, 10) : 6

/**
 * Average delay in seconds between each votes in seconds
 */
var averageDelay = process.env.AVG_DELAY ? parseInt(process.env.AVG_DELAY, 10) : 0.5

var alreadyEntered = []

function psubmitAttendance (memberId, desk) {
  // memberId = 314
  return new Promise(function (accept, reject) {
    var options = {
      method: 'POST',
      uri: serverUrl + '/collect',
      body: {
        desk: desk,
        newmemberid: memberId,
        proxyid: null,
        photo: null // send some funnee picture here ?
      },
      json: true // Automatically stringifies the body to JSON
    }
    console.log(desk + ' collecting ' + memberId)
    request(options).then(function (r) {
      setTimeout(function () {
        if (!r) {
          reject(new Error('Unexpect result for ' + memberId))
        } else if (r.OK === true && r.id === memberId) {
          console.log('     collected ' + memberId)
          accept()
        } else if (r.OK === false && r.message && r.message.toLowerCase().indexOf('duplicate') !== -1) {
          alreadyEntered.push(memberId)
          console.log('     already collected ' + memberId)
          accept()
        } else {
          reject(new Error(r.message))
        }
      }, Math.random() * 1000 * averageDelay)
    }).catch(reject)
  })
}

Promise.coroutine(function * () {
  var members = yield datasets.pgetEligibleMembersIds()
  console.log('number of eligible members', members.length)
  var shuffled = shuffle(members)
  // yield psubmitAttendance(members[0], 'teststation1')
  var numberPerDesk = Math.ceil(members.length) / workers
  // prepare the attendance queue for each desk
  var queuePerDesk = [] // desk-number   -> list of members-id
  var c = 0
  var deskNames = []
  for (var i = 0; i < workers; i++) {
    deskNames.push('desktest-' + i)
  }
  deskNames.forEach(function (deskName) {
    var queue = []
    for (var j = 0; j < numberPerDesk; j++) {
      if (c >= shuffled.length) { break }
      queue.push(shuffled[c])
      c++
    }
    var pDesk = Promise.resolve(queue).each(function (memberId) {
      return psubmitAttendance(memberId, deskName)
    })
    queuePerDesk.push(pDesk)
  })
  console.time('attend!')
  yield Promise.all(queuePerDesk)
})().then(function () {
  console.timeEnd('attend!')
  if (alreadyEntered.length) {
    console.log('done. ' + alreadyEntered.length +
      ' members had already voted:', alreadyEntered)
  } else {
    console.log('Done. All eligible members have `voted`.')
  }
  process.exit()
}).catch(function (e) {
  console.error(e.message, e.stack)
  process.exit(1)
})
