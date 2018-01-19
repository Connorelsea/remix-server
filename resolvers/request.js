import { isAuthenticatedResolver } from "./access"
import { baseResolver } from "./base"
import { FriendRequest, GroupRequest, GroupInvitation } from "../connectors"
import { Op } from "sequelize"

const createFriendRequest = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { message, fromUserId, toUserId } = args
    const request = await FriendRequest.create({
      message,
      fromUserId,
      toUserId,
    })

    return request.id
  }
)

const getFriendRequests = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { id } = root
    const requests = await FriendRequest.findAll({
      where: { toUserId: id },
      raw: true,
    })
    return requests
  }
)

export default {
  Mutation: {
    createFriendRequest,
  },
  Query: {},
}
