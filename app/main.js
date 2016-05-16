'use strict'
var logger = require('koa-logger')
var koa = require('koa')
var json = require('koa-json')
var serve = require('koa-static')
var session = require('koa-session')
var bodyparser = require('koa-bodyparser')
var websockify = require('koa-websocket')
var route = require('koa-route')

try {
  require('../env')
} catch (x) {
  console.log('No custom configuration: all default parameters')
}

process.env.DEFAULT_HTML_PAGE = process.env.DEFAULT_HTML_PAGE || '/vote.html'

var port = 1999
if (process.env.APP_PORT && parseInt(process.env.APP_PORT, 10) > 0) {
  port = parseInt(process.env.APP_PORT, 10)
}

var app = websockify(koa())

app.use(logger())
app.use(bodyparser())
app.use(json({ pretty: false, param: 'pretty' }))

if (!process.env.DISABLE_AUTH) { // no session and no auth during load test
  app.keys = ['dont dcr67 me c00k1 man']
  app.use(session(app))
  require('./auth')(app)
}

const datasetsApi = require('./searchable-datasets')
const searchableColumns = ['newmemberid', 'famname', 'firstname', 'middlename', 'preferredname', 'nric']

const slip = require('./slip')
console.log('Prefetching searchable datasets')

var baseTotal
var quorumPercentage = 50 // %

/** set of connected voting websockets */
var connected = new Set()

datasetsApi.getDatasets(searchableColumns, function (err, datasets, _baseTotal) {
  if (err) {
    console.error('Error fetching the datasets', err)
    process.exit(1)
  }

  baseTotal = _baseTotal
  datasets.forEach(function (dataset, i) {
    app.use(function *(next) {
      if (this.originalUrl.startsWith('/' + searchableColumns[i])) {
        this.body = dataset
      } else {
        yield next
      }
    })
  })

  app.use(function *(next) {
    if (this.originalUrl === '/' || this.originalUrl === '/index.html') {
      return this.redirect(process.env.DEFAULT_HTML_PAGE)
    }
    if (this.originalUrl.startsWith('/checkedit')) {
      this.body = yield slip.pcheckedit(this.request.query.id)
    } else if (this.originalUrl.startsWith('/check')) {
      this.body = yield slip.pcheck(this.request.query.id)
    } else if (this.originalUrl.startsWith('/deskname')) {
      this.body = process.env.DISABLE_AUTH ? 'loadtesting' : this.session.user // username
    } else {
      yield next
    }
  })

  app.use(function *(next) {
    if (this.originalUrl.indexOf('.html') !== -1) {
      yield next
    } else if (this.originalUrl.startsWith('/collection')) {
      var members = yield datasetsApi.pgetMembersCollectionDump()
      this.body = { data: members }
    } else if (this.originalUrl.startsWith('/collect') && !this.originalUrl.startsWith('/collection')) {
      let body = this.request.body
      let desk = process.env.DISABLE_AUTH ? body.desk : this.session.user // username
      let rows
      try {
        rows = yield slip.pcollect(desk, body.newmemberid, body.proxyid, body.photo)
        this.body = {OK: true, id: body.newmemberid, rows: rows}
        broadcastProgress()
      } catch (x) {
        console.log('Collecting for ' + body.newmemberid + ' rejected: ' + x.message)
        this.body = {'OK': false, message: x.message}
      }
    } else if (this.originalUrl.startsWith('/update')) {
      let body = this.request.body
      let desk = process.env.DISABLE_AUTH ? body.desk : this.session.user // username
      let rows
      try {
        rows = yield slip.pupdate(desk, body.newmemberid, body.nric)
        this.body = {OK: true, id: body.newmemberid, rows: rows}
        broadcastProgress()
      } catch (x) {
        console.log('Collecting for ' + body.newmemberid + ' rejected: ' + x.message)
        this.body = {'OK': false, message: x.message}
      }
    } else if (this.originalUrl.startsWith('/pivotmembers')) {
      var pivotmembers = yield datasetsApi.pgetMembersPivotDump()
      this.body = pivotmembers
    } else {
      yield next
    }
  })

  app.use(serve('.', {defer: true}))

  app.ws.use(route.all('/voting', function * (/* next*/) {
    // this.websocket.send('Hello World')
    var ctx = this
    if (!connected.has(ctx.websocket)) {
      connected.add(ctx.websocket)
      broadcastProgress()
    }
    ctx.websocket.on('close', function () {
      connected.delete(ctx.websocket)
      broadcastProgress()
    })
  }))

  app.listen(port, '0.0.0.0')
  console.log('listening on port ' + port)
})

/** Send to all connected browsers the progress. */
function broadcast (msg) {
  var payload = typeof msg !== 'string' ? JSON.stringify(msg) : msg
  for (let websocket of connected) {
    websocket.send(payload)
  }
}

// no more than one broadcast per second
var alreadyBroadcasting = false
function broadcastProgress () {
  if (alreadyBroadcasting) {
    return
  }
  alreadyBroadcasting = true
  setTimeout(function () {
    datasetsApi.countCollectionsAndExtraQuorum(function (err, collectionsNb, extraVotingMembers) {
      if (err) { return }
      var progress = {
        connected: connected.size,
        collected: collectionsNb,
        total: extraVotingMembers + baseTotal,
        quorum: quorumPercentage
      }
      alreadyBroadcasting = false
      broadcast(progress)
    })
  }, 500)
}
