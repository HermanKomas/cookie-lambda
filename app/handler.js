'use strict';

const { App, ExpressReceiver } = require('@slack/bolt');

// const expressReceiver = new ExpressReceiver({
//   signingSecret: process.env.SLACK_SIGNING_SECRET
// });

// const makeAppWithToken = (token, expressReceiver) => {
//   return new App({
//     token: token,
//     receiver: expressReceiver
//   });
// }

// const makeAppWithOauth = expressReceiver => {
//   const oauth = require('./lib/oauth');

//   const app = new App({
//     authorize: oauth.auth,
//     receiver: expressReceiver
//   });

//   oauth.install(expressReceiver.app, app.client);

//   return app;
// }

// const app = (process.env.USE_OAUTH || false) ?
//   makeAppWithToken(process.env.SLACK_BOT_TOKEN, expressReceiver)
//   : makeAppWithOauth(expressReceiver);

// require('./lib/bot')(app);

// ------------------------
// Bolt App Initialization
// ------------------------
const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  processBeforeResponse: true,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: expressReceiver,
  processBeforeResponse: true,
});

app.command('/echo', async ({ command, logger, ack, say }) => {
  try {
    await say(`${command.text}`);
    await ack();
  } catch (e) {
    logger.error(e);
    await ack(`:x: Failed to post a message (error: ${e})`);
  }
});

// ------------------------
// AWS Lambda handler
// ------------------------
const awsServerlessExpress = require('aws-serverless-express');
const server = awsServerlessExpress.createServer(expressReceiver.app);
module.exports.app = (event, context) => {
  awsServerlessExpress.proxy(server, event, context);
}