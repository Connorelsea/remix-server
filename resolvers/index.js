import { combineResolvers } from "apollo-resolvers"

import User from "./user"

/*
  This combines our multiple resolver definition
  objects into a single definition object
*/
const resolvers = combineResolvers([User])

export default resolvers
