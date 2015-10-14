'use strict';
var logger = require('koa-logger');
var auth = require('basic-auth');
var koa = require('koa');
var json = require('koa-json');
var serve = require('koa-static');
var session = require('koa-session');
var jsonBody = require('koa-json-body');

var app = koa();

app.use(logger());
app.use(jsonBody({ limit: '250kb' }));
app.use(json({ pretty: false, param: 'pretty' }));

app.keys = ['dont dcr67 me c00k1 man'];
app.use(session(app));

// basic auth.
const users = {
  admin: "admin",
  hugues: "hugues",
  maria: "maria",
  paul: "paul",
  tatang: "tatang"
};
app.use(function *basicAuth(next){
  var user = auth(this);
  if (user && users[user.name] === user.pass) {
    yield next;
  } else {
    this.throw(401);
  }
});

// Dont access our app sources.
app.use(function *redirprivate(next) {
  if (this.originalUrl.startsWith('/app/')) {
    return this.redirect('/');
  }
  yield next;
});

const datasets = require('./searchable-datasets');
const searchableColumns = ['newmemberid', 'famname', 'firstname', 'preferredname', 'nric'];

const slip = require('./slip');
console.log('Prefetching searchable datasets');
datasets.getDatasets(searchableColumns, function(err, datasets) {
  if (err) {
    console.error('Error fetching the datasets', err);
    process.exit(1);
  }
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
      this.body = auth(this).name; // user.name;
    } else {
      yield next;
    }
  });

  app.use(function *(next) {
    if (this.originalUrl.startsWith('/collect')) {
      var desk = auth(this).name; // user.name
      var body = this.request.body;
      var rows = yield slip.pcollect(body.newmemberid, body.proxyid, desk, body.photo);
      this.body = {'OK':true, 'id': body.newmemberid, 'rows': rows};
    } else {
      yield next;
    }
  });

  app.use(serve('.', {defer:true}));

  app.listen(2000);
  console.log('listening on port 2000');
});
