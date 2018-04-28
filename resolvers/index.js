import { combineResolvers } from "apollo-resolvers";

import user from "./user";
import request from "./request";
import groups from "./groups";
import scalars from "./scalars";
import message from "./messages";
import messages from "./messages";
import devices from "./devices";
import activity from "./activity";
import identity from "./identity";

/*
  This combines our multiple resolver definition
  objects into a single definition object
*/
const resolvers = combineResolvers([
  user,
  identity,
  request,
  groups,
  scalars,
  messages,
  devices,
  activity
]);

export default resolvers;
