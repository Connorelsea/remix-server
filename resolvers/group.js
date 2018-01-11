import { isAuthenticatedResolver } from "./access"
import { baseResolver } from "./base"
import { Group } from "../connectors"

const createGroup = isAuthenticatedResolver.createResolver(
  async (root, { name, username }, context, error) => {
    let group = await Group.create({
      name,
      username,
    })

    return group.id
  }
)

export default {
  Mutation: {
    createGroup,
  },
}
