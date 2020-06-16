'use strict';

var matchHistoryMap = new Map();

async function getChannelMembers(channelId, app) {

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

async function getUserInfo(userId, app) {
  try {
    const response = await app.client.users.info({
      token: process.env.SLACK_BOT_TOKEN,
      user: userId
    });

    return response.user;
  } catch (error) {
    console.log('ERROR: ' + error);
  }
}

async function sendMessage(channelId, text, app) {
  console.log('Sending message to channel: ' + channelId);
  try {
      await app.client.chat.postMessage({
          token: process.env.SLACK_BOT_TOKEN,
          channel: channelId,
          text: text
      });
  } catch (error) {
      console.log('ERROR: ' + error);
  }
}

async function sendIntroMessage(channelId, app) {
  const members = await getChannelMembers(channelId, app);
  const userData = await Promise.all(members.map(member => getUserInfo(member, app)));
  const userNames = userData
    .filter(userInfo => !userInfo.is_bot)
    .map(user => "<@" + user.id + ">")

  const message = ":raised_hands: Hey there "
    + userNames.join(", ")
    + " - time for " + "<#" + COOKIE_CHANNEL + ">"
    + " catch up! Grab a :cookie: and have a chat :upside_down_face:";

  sendMessage(channelId, message, app)
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

async function openConversation(userListId, app) {
  try {
    const response = await app.client.conversations.open({
      token: process.env.SLACK_BOT_TOKEN,
      users: userListId.join(',')
    });

    return response.channel.id;
  } catch (error) {
    console.log('ERROR: ' + error);
  }
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

async function doMatches(app) {
  console.log("Doing matches...")
  const COOKIE_CHANNEL = "C0146HCG2LA";
  const channelMembersIds = await getChannelMembers(COOKIE_CHANNEL, app);
  console.log("Channel Members: " + channelMembersIds)
  const allUsers = await Promise.all(channelMembersIds.map(memberId => getUserInfo(memberId, app)));
  console.log("All Users: " + allUsers)
  const userList = allUsers.filter(userInfo => !userInfo.is_bot);
  console.log("All Users - No bots: " + userList)

  const matches = getMatches(userList.map(user => user.id));
  console.log("Matches: " + matches)
  const chatIds = await Promise.all(matches.map(match => openConversation(match, app)));
  console.log("Chat Ids: " + chatIds)

  chatIds.forEach(id => sendIntroMessage(id, app));
}

module.exports = app => {
  app.message('match', async ({ message, say, logger }) => {
    try {
      console.log("Got the request")
      await say(`hello`);
      // await doMatches(app);
    } catch(error) {
      logger.error(error);
    }
  });
}