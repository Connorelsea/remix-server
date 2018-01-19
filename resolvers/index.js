import { combineResolvers } from "apollo-resolvers"

import user from "./user"
import request from "./request"
/*
  This combines our multiple resolver definition
  objects into a single definition object
*/
const resolvers = combineResolvers([user, request])

export default resolvers
