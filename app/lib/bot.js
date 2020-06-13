'use strict';

const axios = require('axios');

module.exports = app => {
  const command = process.env.COMMAND || 'secret-message';
  const sharelock_base_path = process.env.SHARELOCK_BASE_PATH || 'https://sharelock.io'
  const send_message_callback = 'send_message';
  const url_visit_callback = 'url_visit';

  app.command(`/${command}`, ({ ack, payload, context }) => {
    app.client.views
      .open({
        token: context.botToken,
        trigger_id: payload.trigger_id,
        view: view_source()
      })
      .then(() => ack());
  });

  app.view(send_message_callback, ({ ack, body, view, context }) => {
    const userId = view.state.values.users.user_select.selected_user;
    const message = view.state.values.message.message_input.value;

    app.client.token = context.userToken;

    app.client.users.profile.get({ user: userId })
      .then(result => {
        const profile = result.profile;

        if (profile.bot_id) {
          return view_error(ack, "I can't send a secret message to a bot. Please select another user.");
        }

        if (!profile.email) {
          // This should never happen, but just in case we can't get an email address for this user for any other reason
          return view_error(ack, "I couldn't find the email address for that person");
        }

        axios
          .post(`${sharelock_base_path}/create`, {
            a: profile.email,
            d: message
          })
          .then(response => {
            const url = sharelock_base_path + response.data;

            app.client.chat
              .postMessage({
                channel: userId,
                token: context.botToken,
                username: "Secret Message",
                blocks: [
                  {
                    type: 'section',
                    text: {
                      type: 'plain_text',
                      text: `<@${body.user.name}> has sent you a secret message.`
                    },
                    accessory: {
                      type: 'button',
                      action_id: url_visit_callback,
                      text: {
                        type: 'plain_text',
                        text: 'View message'
                      },
                      url: url
                    }
                  }
                ]
              })
              .then(() => ack());
          })
          .catch(error => {
            console.error(error);

            view_error(ack, 'Sorry, there was an error when I tried to encrypt your message.');
          });
      });
  });

  app.event(url_visit_callback, ({ ack }) => {
    ack();
  });

  const view_error = (ack, error) => {
    return ack({
      response_action: 'update',
      view: view_source(error)
    });
  }

  const view_source = (error = "") => {
    const blocks = [
      {
        type: 'input',
        block_id: 'users',
        label: {
          type: 'plain_text',
          text: 'Pick a recipient from the list'
        },
        element: {
          action_id: 'user_select',
          type: 'users_select',
          placeholder: {
            type: 'plain_text',
            text: 'Select user'
          }
        }
      },
      {
        type: 'input',
        block_id: 'message',
        label: {
          type: 'plain_text',
          text: 'Enter your message'
        },
        element: {
          type: 'plain_text_input',
          action_id: 'message_input',
          multiline: true
        }
      }
    ];

    if (error !== "") {
      blocks.unshift({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${error}*`
        }
      });
    }

    return {
      type: 'modal',
      callback_id: send_message_callback,
      title: {
        type: 'plain_text',
        text: 'Send a secret message'
      },
      blocks: blocks,
      submit: {
        type: 'plain_text',
        text: 'Send message'
      }
    };
  }

  const channelMembersIds = await getChannelMembers(COOKIE_CHANNEL);
  const allUsers = await Promise.all(channelMembersIds.map(memberId => getUserInfo(memberId)));
  const userList = allUsers.filter(userInfo => !userInfo.is_bot);
  var openChats;
  const COOKIE_CHANNEL = "C0146HCG2LA";
  var matchHistoryMap = new Map();


app.message('match', async ({ message, say }) => {
  const matches = getMatches(userList.map(user => user.id));
  const chatIds = await Promise.all(matches.map(match => openConversation(match)));

  openChats = chatIds;

  chatIds.forEach(id => sendIntroMessage(id));
});

app.message('remind', async ({ message, say }) => {
  sendReminders();
});

app.action('yes_button', async ({ ack, say }) => {
  console.log("got yes!...")
  await ack();
  await say('lovely :smile:');
});

app.action('scheduled_button', async ({ ack, say }) => {
  await ack();
  await say('gotcha :thumbsup_all:');

});

app.action('no_button', async ({ ack, say }) => {
  await ack();
  await say('No worries, I will check in later :wave:');
});

function sendReminders() {
  openChats.forEach(chat => sendRemindMessage(chat));
}

async function sendRemindMessage(chatId) {
  const blocks = [
      {
          "type": "section",
          "text": {
              "type": "mrkdwn",
              "text": ":wave: cookie here! Have you had a chance to meet yet?"
          }
      },
      {
          "type": "actions",
          "elements": [
              {
                  "action_id": "yes_button",
                  "type": "button",
                  "text": {
                      "type": "plain_text",
                      "emoji": true,
                      "text": "Yes, we did :smile:"
                  },
                  "style": "primary",
                  "value": "yes"
              },
              {
                  "action_id": "scheduled_button",
                  "type": "button",
                  "text": {
                      "type": "plain_text",
                      "emoji": true,
                      "text": "It's scheduled :clock3:"
                  },
                  "style": "primary",
                  "value": "scheduled"
              },
              {
                  "action_id": "no_button",
                  "type": "button",
                  "text": {
                      "type": "plain_text",
                      "emoji": true,
                      "text": "Not yet!"
                  },
                  "style": "danger",
                  "value": "no"
              }
          ]
      }
  ];
  await sendFormmattedMessage(chatId, blocks);
}

function setMatchHistory(key, value) {
  if (matchHistoryMap.has(key)) {
      const updatedValue = matchHistoryMap.get(key).concat([value]);
      matchHistoryMap.set(key, updatedValue)
  } else {
      matchHistoryMap.set(key, [value])
  }
}

function updateMatchHistory(partyOneId, partyTwoId) {
  setMatchHistory(partyOneId, partyTwoId);
  setMatchHistory(partyTwoId, partyOneId);
}

function getMatches(userListIds) {

  var matchTuples = [];
  while (userListIds.length > 0) {
      const partyOneIndex = Math.floor(Math.random() * userListIds.length);
      const partyOneId = userListIds[partyOneIndex];
      userListIds.splice(partyOneIndex, 1);

      let filteredList = matchHistoryMap.has(partyOneId)
          ? userListIds.filter(userId => !matchHistoryMap.get(partyOneId).includes(userId))
          : userListIds;

      if (filteredList.length < 1) {
          matchHistoryMap.set(matchHistoryMap.get(partyOneId), []);
          filteredList = userListIds;
      }

      const partyTwoIndex = Math.floor(Math.random() * filteredList.length);
      const partyTwoId = filteredList[partyTwoIndex];

      userListIds = userListIds.filter(user => user != partyTwoId);

      matchTuples.push([partyOneId, partyTwoId])

      updateMatchHistory(partyOneId, partyTwoId);
  }
  return matchTuples;
}

async function sendIntroMessage(channelId) {
  const members = await getChannelMembers(channelId);
  const userData = await Promise.all(members.map(member => getUserInfo(member)));
  const userNames = userData
      .filter(userInfo => !userInfo.is_bot)
      .map(user => "<@" + user.id + ">")

  const message = ":raised_hands: Hey there "
      + userNames.join(", ")
      + " - time for " + "<#" + COOKIE_CHANNEL + ">"
      + " catch up! Grab a :cookie: and have a chat :upside_down_face:";

  sendMessage(channelId, message)
}

async function sendFormmattedMessage(channelId, blocks) {
  try {
      await app.client.chat.postMessage({
          token: BOT_TOKEN,
          channel: channelId,
          blocks: blocks
      });
  } catch (error) {
      console.log('ERROR: ' + error);
  }
}

async function sendMessage(channelId, text) {
  try {
      await app.client.chat.postMessage({
          token: BOT_TOKEN,
          channel: channelId,
          text: text
      });
  } catch (error) {
      console.log('ERROR: ' + error);
  }
}

async function openConversation(userListId) {
  try {
      const response = await app.client.conversations.open({
          token: BOT_TOKEN,
          users: userListId.join(',')
      });

      return response.channel.id;
  } catch (error) {
      console.log('ERROR: ' + error);
  }
}

async function getUserInfo(userId) {
  try {
      const response = await app.client.users.info({
          token: BOT_TOKEN,
          user: userId
      });

      return response.user;
  } catch (error) {
      console.log('ERROR: ' + error);
  }
}

async function getChannelMembers(channelId) {
  try {
      const response = await app.client.conversations.members({
          token: process.env.SLACK_BOT_TOKEN,
          channel: channelId
      });

      return response.members;
  } catch (error) {
      console.log('ERROR: ' + error);
  }
}
}