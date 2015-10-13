'use strict';
var logger = require('koa-logger');
var auth = require('basic-auth');
var koa = require('koa');
var json = require('koa-json');
var app = koa();
var serve = require('koa-static');

// logging
app.use(logger());

app.use(json({ pretty: false, param: 'pretty' }));

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
const searchableColumns = ['famname', 'firstname', 'preferredname', 'nric'];

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
  app.use(serve('.', {defer:true}));

  app.listen(2000);
  console.log('listening on port 2000');
});
