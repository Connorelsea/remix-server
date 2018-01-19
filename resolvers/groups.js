import { isAuthenticatedResolver } from "./access"
import { baseResolver } from "./base"
import { User, Group } from "../connectors"
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
    const group = await Group.findOne({ where: { id }, raw: true })
    return group
  }
)

export default {
  Mutation: {
    createGroup,
  },
  Query: {
    Group: getGroup,
  },
  Group: {},
}
