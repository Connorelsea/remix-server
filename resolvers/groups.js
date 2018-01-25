import { isAuthenticatedResolver } from "./access"
import { baseResolver } from "./base"
import { User, Group, Chat, Message } from "../connectors"
import { Op } from "sequelize"

const createGroup = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { iconUrl, name, description } = args
    const group = await Group.create({
      iconUrl,
      name,
      description,
    })

    return group
  }
)

const getGroup = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { id } = args
    const group = await Group.findOne({ where: { id } })
    return group
  }
)

const getChats = isAuthenticatedResolver.createResolver(
  async (group, args, context, info) => {
    return await group.getChats()
  }
)

const getChat = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { id } = args
    const chat = await Chat.findOne({ where: { id } })
    return chat
  }
)

export default {
  Mutation: {
    createGroup,
  },
  Query: {
    Group: getGroup,
    Chat: getChat,
  },
  Group: {
    chats: getChats,
  },
  Chat: {},
}
