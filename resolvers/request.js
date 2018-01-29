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
        description: `${currentUser.id}:${currentUser.name},${newFriend.id}:${
          newFriend.name
        }`,
      })

      newGroup.addMember(currentUser)
      newGroup.addMember(newFriend)

      const newChat = await Chat.create({
        name: "general",
      })

      newGroup.addChat(newChat)
      newChat.setGroup(newGroup)

      friendRequest.destroy()

      return friendRequestId
    } else {
      return -999
      // throw erorr, not right user
    }
  }
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
        (payload, variables) => {
          console.log(payload, variables)
          return payload.newFriendRequest.toUserId == variables.toUserId
        }
        // TODO add real filtering here
      ),
      // resolve: payload => {
      //   console.log("RESOLVE NEW FRIEND REQUEST SUBSCRIPTION")
      //   console.log(payload)
      //   return new FriendRequest(payload.newFriendRequest)
      // },
      // subscribe: () => ps.asyncIterator("newFriendRequest"),
    },
  },
}
