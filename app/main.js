'use strict';
var logger = require('koa-logger');
var koa = require('koa');
var json = require('koa-json');
var serve = require('koa-static');
var session = require('koa-session');
var bodyparser = require('koa-bodyparser');
var websockify = require('koa-websocket');
var route = require('koa-route');

try {
  require('../env');
} catch(x) {
  console.log('No custom configuration: all default parameters');
}

var port = 1999;
if (process.env.APP_PORT && parseInt(process.env.APP_PORT) > 0) {
  port = parseInt(process.env.APP_PORT);
}

var app = websockify(koa());

app.use(logger());
app.use(bodyparser());
app.use(json({ pretty: false, param: 'pretty' }));

if (!process.env.DISABLE_AUTH) { // no session and no auth during load test
  app.keys = ['dont dcr67 me c00k1 man'];
  app.use(session(app));
  require('./auth')(app);
}

const datasetsApi = require('./searchable-datasets');
const searchableColumns = ['newmemberid', 'famname', 'firstname', 'middlename', 'preferredname', 'nric'];

const slip = require('./slip');
console.log('Prefetching searchable datasets');

var baseTotal;
var quorumPercentage = 50; // %

/** set of connected voting websockets */
var connected = new Set();

datasetsApi.getDatasets(searchableColumns, function(err, datasets, _baseTotal) {
  if (err) {
    console.error('Error fetching the datasets', err);
    process.exit(1);
  }

  baseTotal = _baseTotal;
  datasets.forEach(function(dataset, i) {
    app.use(function *(next) {
      if (this.originalUrl.startsWith('/' + searchableColumns[i])) {
        this.body = dataset;
      } else {
        yield next;
      }
    });
  });

  app.use(function *(next) {
    if (this.originalUrl.startsWith('/check')) {
      var id = this.request.query.id;
      var rows = yield slip.pcheck(id);
      this.body = rows;
    } else if (this.originalUrl.startsWith('/deskname')) {
      this.body = process.env.DISABLE_AUTH ? 'loadtesting' : this.session.user; // username;
    } else {
      yield next;
    }
  });

  app.use(function *(next) {
    if (this.originalUrl.startsWith('/collect')) {
      var body = this.request.body;
      var desk = process.env.DISABLE_AUTH ? body.desk : this.session.user; // username
      var rows;
      try {
        rows = yield slip.pcollect(body.newmemberid, body.proxyid, desk, body.photo);
        this.body = {OK:true, id: body.newmemberid, rows: rows};
        broadcastProgress();
      } catch(x) {
        console.log('Collecting for ' + body.newmemberid + ' rejected: ' + x.message);
        this.body = {'OK':false, message: x.message};
      }
    } else {
      yield next;
    }
  });

  app.use(serve('.', {defer:true}));

  app.ws.use(route.all('/voting', function* (/*next*/) {
    // this.websocket.send('Hello World');
    var ctx = this;
    if (!connected.has(ctx.websocket)) {
      connected.add(ctx.websocket);
      broadcastProgress();
    }
    ctx.websocket.on('close', function() {
      connected.delete(ctx.websocket);
      broadcastProgress();
    });
  }));

  // app.ws.use(route.all('/pivotmembers', function* (/*next*/) {
  //
  // });

  app.listen(port, '0.0.0.0');
  console.log('listening on port ' + port);
});

/** Send to all connected browsers the progress. */
function broadcast(msg) {
  var payload = typeof msg !== 'string' ? JSON.stringify(msg) : msg;
  for(let websocket of connected) {
    websocket.send(payload);
  }
}

// no more than one broadcast per second
var alreadyBroadcasting = false;
function broadcastProgress() {
  if (alreadyBroadcasting) {
    return;
  }
  alreadyBroadcasting = true;
  setTimeout(function() {
    console.log('broadcasting');
    datasetsApi.countCollectionsAndExtraQuorum(function(err, collectionsNb, extraVotingMembers) {
      var progress = {
        connected: connected.size,
        collected: collectionsNb,
        total: extraVotingMembers + baseTotal,
        quorum: quorumPercentage
      };
      alreadyBroadcasting = false;
      broadcast(progress);
    });
  }, 500);
}
