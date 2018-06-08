import { isAuthenticatedResolver } from "./access";
import { baseResolver } from "./base";
import { User, Group, Chat, Message } from "../connectors";
import { Op } from "sequelize";

const createGroup = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { iconUrl, name, username, description } = args;

    try {
      const newGroup = await Group.create({
        iconUrl,
        name,
        username,
        description,
        isDirectMessage: false,
      });

      const currentUser = await User.findOne({
        where: { id: context.user.id },
      });

      let response = await newGroup.addMember(currentUser);

      const newChat = await Chat.create({
        name: "general",
        description: "Conversation and chatting",
      });

      newGroup.addChat(newChat);
      await newChat.setGroup(newGroup);

      return newGroup;
    } catch (err) {
      console.error(err);
    }
  }
);

const getGroup = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { id } = args;
    const group = await Group.findOne({ where: { id } });
    return group;
  }
);

const createChat = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { inGroupId, name, description } = args;
    const chat = await Chat.create({ groupId: inGroupId, name, description });
    const group = await chat.getGroup();
    group.addChat(chat);
    return chat;
  }
);

const getChats = baseResolver.createResolver(
  async (group, args, context, info) => {
    return await group.getChats();
  }
);

const getMembers = baseResolver.createResolver(
  async (group, args, context, info) => {
    return await group.getMembers();
  }
);

const getChat = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { id } = args;
    const chat = await Chat.findOne({ where: { id } });
    return chat;
  }
);

const getMessages = isAuthenticatedResolver.createResolver(
  async (chat, args, context, error) => {
    return await chat.getMessages();
  }
);

/**
 * These endpoints both take a set of unique identifiers that represent
 * groups and returns metadata about those groups.
 */

const getGroupsById = baseResolver.createResolver(
  async (root, args, context, info) => {
    let groups = args.groupIdentifiers;
    groups = groups.map(group => Group.find({ where: { id: group } }));
    const groupModelResults = await Promise.all(groups);
    return groupModelResults;
  }
);

const getGroupsByName = baseResolver.createResolver(
  async (root, args, context, info) => {
    let groups = args.groupIdentifiers;
    groups = groups.map(group => Group.find({ where: { username: group } }));
    const groupModelResults = await Promise.all(groups);
    return groupModelResults;
  }
);

export default {
  Mutation: {
    createGroup,
    createChat,
  },
  Query: {
    Group: getGroup,
    Chat: getChat,
    getGroupsById,
    getGroupsByName,
  },
  Group: {
    chats: getChats,
    members: getMembers,
  },
  Chat: {
    messages: getMessages,
  },
};
