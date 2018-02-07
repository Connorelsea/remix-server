import { isAuthenticatedResolver } from "./access"
import { baseResolver } from "./base"
import {
  User,
  FriendRequest,
  MyFriendRequests,
  Message,
  Content,
  ReadPosition,
} from "../connectors"

import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

import { Op } from "sequelize"

import { createError } from "apollo-errors"
import { resolver } from "graphql-sequelize"

const getHash = password => bcrypt.hashSync(password, 10)
const getToken = payload => jwt.sign(payload, "secretText", { expiresIn: 1440 })

const createUser = baseResolver.createResolver(
  async (
    root,
    { name, username, password, description, email, phone_number, color },
    context,
    error
  ) => {
    let hash = getHash(password)

    let user = await User.create({
      name,
      username,
      password: hash,
      description,
      email,
      phone_number,
      color,
    })

    return {
      id: user.id,
      token: getToken({ userId: user.id }),
    }
  }
)

const UserDoesntExistError = createError("UserDoesntExist", {
  message: "A user with this email address does not exist",
})

const WrongPasswordError = createError("WrongPassword", {
  message: "Your password is incorrect, try again",
})

const loginUserWithEmail = baseResolver.createResolver(
  async (root, { email, password }, context, error) => {
    const user = await User.find({
      where: { email: { [Op.like]: email.toLowerCase() } },
    })
    if (!user) return new UserDoesntExistError()
    return loginUser(user, password)
  }
)

const loginUserWithPhone = baseResolver.createResolver(
  async (root, { phone_number, password }, context, error) => {
    const user = await User.find({
      where: { phone_number: { [Op.like]: phone_number } },
    })
    if (!user) return new UserDoesntExistError()
    return loginUser(user, password)
  }
)

const loginUser = async (user, password) => {
  const correctPassword = await bcrypt.compare(password, user.password)
  if (!correctPassword) return new WrongPasswordError()
  return {
    id: user.id,
    token: getToken({ userId: user.id }),
  }
}

const friends = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const user = await User.findOne({ where: { id: root.id } })
    const friends = await user.getFriends()
    return friends
  }
)

const groups = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const user = await User.findOne({ where: { id: root.id } })
    const groups = await user.getGroups()
    return groups
  }
)

const relevantUsers = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { user: { id } } = context
    const user = await User.findOne({ where: { id } })
    let friends = await user.getFriends()
    let groups = await user.getGroups()
    let users = undefined
    if (groups && groups.length > 0)
      users = await Promise.all(groups.map(async g => await g.getMembers()))
    let foundUsers
    if (users && users.length > 0)
      foundUsers = users.reduce(function(prev, curr) {
        return prev.concat(curr)
      })

    if (!foundUsers) foundUsers = []
    if (!friends) friends = []

    return [...friends, ...foundUsers, user]
  }
)

const getUser = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { id } = args
    const user = await User.findOne({ where: { id } })
    return user
  }
)

const getFriendRequests = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { id } = root

    const requests = await FriendRequest.findAll({
      where: { toUserId: id },
      include: [{ model: User, as: "fromUser" }, { model: User, as: "toUser" }],
    })

    return requests
  }
)

const searchUsers = isAuthenticatedResolver.createResolver(
  async (root, { phrase }, context, error) => {
    let transformedPhrase = phrase.replace("-", "").trim()

    const isNumber = !isNaN(phrase)

    let foundUsers = []
    let foundBuffer = []

    if (isNumber) {
      foundBuffer = await User.findAll({
        where: {
          phone_number: { [Op.like]: `%${phrase}%` },
        },
      })
      foundUsers = [...foundUsers, ...foundBuffer]
    }

    foundBuffer = await User.findAll({
      where: {
        [Op.or]: [
          { username: { [Op.iLike]: `%${phrase}%` } },
          { name: { [Op.iLike]: `%${phrase}%` } },
        ],
      },
    })
    foundUsers = [...foundUsers, ...foundBuffer]

    return foundUsers
  }
)

const getAllMessages = isAuthenticatedResolver.createResolver(
  async (user, args, context, info) => {
    const userGroups = await user.getGroups()
    if (userGroups === undefined) return []

    const groupChatCollections = await Promise.all(
      userGroups.map(async group => await group.getChats())
    )

    let chats = []

    groupChatCollections.map(
      chatCollection => (chats = chats.concat(chatCollection))
    )

    const userMessageFilters = await chats.map(chat => ({
      chatId: chat.id,
    }))

    const messages = await Message.findAll({
      where: {
        [Op.or]: userMessageFilters,
      },
      include: [
        { model: Content, as: "content" },
        { model: ReadPosition, as: "readPositions" },
      ],
      order: [["createdAt", "ASC"]],
    })

    return messages
  }
)

const getCurrentReadPositions = isAuthenticatedResolver.createResolver(
  async (user, args, context, info) => {
    return await ReadPosition.findAll({ where: { userId: user.id } })
  }
)

export default {
  Mutation: {
    createUser,
    loginUserWithEmail,
    loginUserWithPhone,
  },
  Query: {
    users: searchUsers,
    relevantUsers,
    User: getUser,
  },
  User: {
    friends,
    groups,
    friendRequests: getFriendRequests,
    allMessages: getAllMessages,
    currentReadPositions: getCurrentReadPositions,
  },
}
