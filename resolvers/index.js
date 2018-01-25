import { combineResolvers } from "apollo-resolvers"

import user from "./user"
import request from "./request"
import groups from "./groups"
import scalars from "./scalars"

/*
  This combines our multiple resolver definition
  objects into a single definition object
*/
const resolvers = combineResolvers([user, request, groups, scalars])

export default resolvers
