'use strict';
var passport = require('koa-passport');
var JSON5 = require('json5');

const users = process.env.AUTH_USERS ? JSON5.parse(process.env.AUTH_USERS) : {
  admin: "admin",
  hugues: "hugues",
  maria: "maria",
  paul: "paul",
  tatang: "tatang"
};

passport.serializeUser(function(request, user, done) {
  request.session.user = user;
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

var LocalStrategy = require('passport-local').Strategy;
passport.use(new LocalStrategy(function(username, password, done) {
  // retrieve user ...
  if (users[username] && users[username] === password) {
    done(null, username);
  } else {
    done(null, false);
  }
}));

module.exports = function setup(app) {
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(function *redirprivate(next) {
    if (this.originalUrl.startsWith('/app/')) {
      // Dont access our app sources.
      return this.redirect('/');
    }
    if (this.originalUrl.startsWith('/jspm_packages/github/twbs/bootstrap') ||
        this.originalUrl.startsWith('/css') ||
        this.originalUrl === '/resources/favicon.png') {
      // correctly render the login page.
      return yield next;
    }
    if (this.originalUrl.startsWith('/login')) {
      if (this.originalUrl === '/login.html') {
        return yield next;
      }
      if (this.method === 'POST') {
        const ctx = this;
        yield passport.authenticate('local', function*(err, user/*, info*/) {
          if (err) { throw err; }
          if (user === false) {
            ctx.status = 401;
            ctx.body = { success: false };
          } else {
            ctx.session.user = user;
            yield ctx.login(user);
            return ctx.redirect('/');
          }
        });
      } else {
        return this.redirect('/login.html');
      }
    }
    if (this.originalUrl.startsWith('/logout')) {
      this.session.user = undefined;
      this.logout();
      return this.redirect('/');
    }
    if (!this.session.user) {
      return this.redirect('/login.html');
    }
    yield next;
  });

};

/**
var FacebookStrategy = require('passport-facebook').Strategy;
passport.use(new FacebookStrategy({
    clientID: 'your-client-id',
    clientSecret: 'your-secret',
    callbackURL: 'http://localhost:' + (process.env.PORT || 3000) + '/auth/facebook/callback'
  },
  function(token, tokenSecret, profile, done) {
    // retrieve user ...
    done(null, user);
  }
));

var GoogleStrategy = require('passport-google-auth').Strategy;
passport.use(new GoogleStrategy({
    clientId: 'your-client-id',
    clientSecret: 'your-secret',
    callbackURL: 'http://localhost:' + (process.env.PORT || 3000) + '/auth/google/callback'
  },
  function(token, tokenSecret, profile, done) {
    // retrieve user ...
    done(null, user);
  }
));
*/
