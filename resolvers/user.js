import { isAuthenticatedResolver } from "./access";
import { baseResolver } from "./base";
import {
  User,
  FriendRequest,
  MyFriendRequests,
  Message,
  Content,
  ReadPosition,
  Group,
  Chat,
  Device,
  GroupInvitation,
} from "../connectors";

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import { Op, col } from "sequelize";

import { createError } from "apollo-errors";
import { resolver } from "graphql-sequelize";

import { genAccessToken, genRefreshToken } from "../utils/token";

const getHash = password => bcrypt.hashSync(password, 10);

const createUser = baseResolver.createResolver(
  async (root, args, context, error) => {
    const {
      name,
      username,
      password,
      description,
      email,
      color,
      iconUrl,
      deviceName,
    } = args;

    let hash = getHash(password);

    // Create new user

    let user = await User.create({
      name,
      username,
      password: hash,
      description,
      email,
      color,
      iconUrl,
    }).catch(e => console.log("USER ERROR", e));

    // Create a new initial default device for the new user
    // Creat access and refresh tokens for this device

    let device = await Device.create({
      name: "Default Device",
      valid: true,
      accessToken: genAccessToken({ userId: user.id }),
      refreshToken: genRefreshToken({ userId: user.id }),
    });

    // Set correct relations for device join

    device.setUser(user);
    user.addDevice(device);

    return device;
  }
);

const friends = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const user = await User.findOne({ where: { id: root.id } });
    const friends = await user.getFriends();
    return friends;
  }
);

const groups = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const user = await User.findOne({ where: { id: root.id } });
    const groups = await user.getGroups();
    return groups;
  }
);

const relevantUsers = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const {
      user: { id },
    } = context;
    const user = await User.findOne({ where: { id } });
    let friends = await user.getFriends();
    let groups = await user.getGroups();
    let users = undefined;
    if (groups && groups.length > 0)
      users = await Promise.all(groups.map(async g => await g.getMembers()));
    let foundUsers;
    if (users && users.length > 0)
      foundUsers = users.reduce(function(prev, curr) {
        return prev.concat(curr);
      });

    if (!foundUsers) foundUsers = [];
    if (!friends) friends = [];

    return [...friends, ...foundUsers, user];
  }
);

const unreadMessages = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const {
      user: { id },
    } = context;

    try {
      const user = await User.findOne({ where: { id } });
      const readPositions = await ReadPosition.findAll({
        where: { userId: id },
      });
      // const groups = await user.getGroups()

      // for each read position, get all messages in its
      // referenced chat after its referenced creation time

      console.log(JSON.stringify(readPositions, null, 2));

      const messagePromises = readPositions.map(rp =>
        Message.findAll({
          where: { chatId: rp.chatId, createdAt: { [Op.gt]: rp.atChatTime } },
        })
      );

      const promiseArrayResults = await Promise.all(messagePromises);
      const messages = promiseArrayResults.reduce((a, b) => a.concat(b), []);

      return messages;
    } catch (ex) {
      return -999;
      console.log(ex);
    }
  }
);

const getUser = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { id } = args;
    const user = await User.findOne({
      where: { id: id },
    });
    console.log(user);
    return user;
  }
);

const searchUsers = isAuthenticatedResolver.createResolver(
  async (root, { phrase }, context, error) => {
    let transformedPhrase = phrase.replace("-", "").trim();

    const isNumber = !isNaN(phrase);

    let foundUsers = [];
    let foundBuffer = [];

    if (isNumber) {
      foundBuffer = await User.findAll({
        where: {
          phone_number: { [Op.like]: `%${phrase}%` },
        },
      });
      foundUsers = [...foundUsers, ...foundBuffer];
    }

    foundBuffer = await User.findAll({
      where: {
        [Op.or]: [
          { username: { [Op.iLike]: `%${phrase}%` } },
          { name: { [Op.iLike]: `%${phrase}%` } },
        ],
      },
    });
    foundUsers = [...foundUsers, ...foundBuffer];

    return foundUsers;
  }
);

// INITIAL GET MESSAGE SEQUENCE RE-WORK
// When the program loads, it should intelligently load unseen messages.

// ALGORITHM FOR UNSEEN MESSAGES

// let user
//
// for each group
//   for each chat
//     chat.messages.map m ->
//       m is after user.readPositions[chat]
//       if user has no

const getAllMessages = isAuthenticatedResolver.createResolver(
  async (user, args, context, info) => {
    const userGroups = await user.getGroups();
    if (userGroups === undefined) return [];

    const groupChatCollections = await Promise.all(
      userGroups.map(async group => await group.getChats())
    );

    let chats = [];

    groupChatCollections.map(
      chatCollection => (chats = chats.concat(chatCollection))
    );

    const userMessageFilters = await chats.map(chat => ({
      chatId: chat.id,
    }));

    const messages = await Message.findAll({
      where: {
        [Op.or]: userMessageFilters,
      },
      include: [
        { model: Content, as: "content" },
        { model: ReadPosition, as: "readPositions" },
      ],
      order: [["createdAt", "ASC"]],
    });

    return messages;
  }
);

const getCurrentReadPositions = isAuthenticatedResolver.createResolver(
  async (user, args, context, info) => {
    return await ReadPosition.findAll({ where: { userId: user.id } });
  }
);

/**
 * My Requests and Invitations
 */

const getFriendRequests = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { id } = root;

    const requests = await FriendRequest.findAll({
      where: { toUserId: id },
      include: [{ model: User, as: "fromUser" }, { model: User, as: "toUser" }],
    });

    return requests;
  }
);

const getGroupInvitations = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { id } = root;

    const invites = await GroupInvitation.findAll({
      where: { toUserId: id },
      include: [{ model: User, as: "fromUser" }, { model: User, as: "toUser" }],
    });

    return invites;
  }
);

const getPendingFriendRequests = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {}
);

const getPendingGroupRequests = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {}
);

export default {
  Mutation: {
    createUser,
  },
  Query: {
    users: searchUsers,
    User: getUser,
    relevantUsers,
    unreadMessages,
  },
  User: {
    friends,
    groups,
    allMessages: getAllMessages,
    currentReadPositions: getCurrentReadPositions,
    friendRequests: getFriendRequests,
    groupInvitations: getGroupInvitations,
  },
};
