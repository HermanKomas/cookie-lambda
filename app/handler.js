'use strict';

const { App, ExpressReceiver } = require('@slack/bolt');

const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

const makeAppWithToken = (token, expressReceiver) => {
  return new App({
    token: token,
    receiver: expressReceiver
  });
}

const makeAppWithTokenNew = (token, secret) => {
  return new App({
    token: token,
    receiver: secret
  });
}

const makeAppWithOauth = expressReceiver => {
  const oauth = require('./lib/oauth');

  const app = new App({
    authorize: oauth.auth,
    receiver: expressReceiver
  });

  oauth.install(expressReceiver.app, app.client);

  return app;
}

const app = (process.env.USE_OAUTH || false) ?
  makeAppWithTokenNew(process.env.SLACK_BOT_TOKEN, process.env.SLACK_SIGNING_SECRET)
  : makeAppWithOauth(expressReceiver);

require('./lib/bot')(app);

module.exports.app = require('serverless-http')(expressReceiver.app);
