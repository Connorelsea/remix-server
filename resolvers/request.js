import { isAuthenticatedResolver } from "./access"
import { baseResolver } from "./base"
import {
  FriendRequest,
  GroupRequest,
  GroupInvitation,
  User,
  Group,
  Chat,
} from "../connectors"
import { Op } from "sequelize"
import { PubSub, withFilter } from "graphql-subscriptions"
import { currentId } from "async_hooks"

const ps = new PubSub()

const createFriendRequest = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { message, fromUserId, toUserId } = args
    const friendRequest = await FriendRequest.create(
      {
        message,
        fromUserId,
        toUserId,
      },
      {
        include: [
          { model: User, as: "fromUser" },
          { model: User, as: "toUser" },
        ],
      }
    )

    ps.publish("newFriendRequest", {
      newFriendRequest: friendRequest,
    })

    return friendRequest
  }
)

const getToUser = baseResolver.createResolver(
  async (root, args, context, info) => {
    return root.getToUser()
  }
)

const getFromUser = baseResolver.createResolver(
  async (root, args, context, info) => {
    return root.getFromUser()
  }
)

const acceptFriendRequest = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { friendRequestId } = args
    const { user: { id } } = context

    const friendRequest = await FriendRequest.findOne({
      where: { id: friendRequestId },
    })

    if (friendRequest.toUserId === id) {
      const currentUser = await User.findOne({ where: { id } })
      const newFriend = await User.findOne({
        where: { id: friendRequest.fromUserId },
      })
      currentUser.addFriend(newFriend)
      newFriend.addFriend(currentUser)

      const newGroup = await Group.create({
        name: "friend",
        description: `A great friendship`,
        isDirectMessage: true,
      })

      newGroup.addMember(currentUser)
      newGroup.addMember(newFriend)

      const newChat = await Chat.create({
        name: "general",
      })

      const secondChat = await Chat.create({
        name: "music",
      })

      newGroup.addChat(newChat)
      await newChat.setGroup(newGroup)

      newGroup.addChat(secondChat)
      await secondChat.setGroup(newGroup)

      await friendRequest.destroy()

      // Send web socket notification to both new friends
      // The frontend will react to these by adding a new
      // relevant user and new group to the redux store.

      ps.publish("newFriend", {
        newFriend: {
          forUserId: currentUser.id,
          newUser: newFriend,
          newGroup,
        },
      })

      ps.publish("newFriend", {
        newFriend: {
          forUserId: newFriend.id,
          newUser: currentUser,
          newGroup,
        },
      })

      return "true"
    } else {
      return -999
      // throw erorr, not right user
    }
  }
)

const sendGroupInvitation = isAuthenticatedResolver.createResolver(
  async (root, args, context, info) => {}
)

const acceptGroupInvitation = isAuthenticatedResolver.createResolver(
  async (root, args, context, info) => {}
)

export default {
  FriendRequest: {
    toUser: getToUser,
    fromUser: getFromUser,
  },
  Mutation: {
    createFriendRequest,
    acceptFriendRequest,
  },
  Query: {},
  Subscription: {
    newFriendRequest: {
      subscribe: withFilter(
        () => ps.asyncIterator("newFriendRequest"),
        (payload, variables) =>
          payload.newFriendRequest.toUserId == variables.toUserId
      ),
    },
    newFriend: {
      subscribe: withFilter(
        () => ps.asyncIterator("newFriend"),
        (payload, variables) =>
          payload.newFriend.forUserId == variables.forUserId
      ),
    },
  },
}
