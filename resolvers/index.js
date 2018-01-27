import { combineResolvers } from "apollo-resolvers"

import user from "./user"
import request from "./request"
import groups from "./groups"
import scalars from "./scalars"
import message from "./messages"
import messages from "./messages"
/*
  This combines our multiple resolver definition
  objects into a single definition object
*/
const resolvers = combineResolvers([user, request, groups, scalars, messages])

export default resolvers
