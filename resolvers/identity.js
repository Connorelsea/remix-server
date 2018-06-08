import { baseResolver } from "./base";
import { User } from "../connectors";

/**
 * These endpoints both take a set of unique identifiers that represent
 * users and returns metadata about those users.
 *
 * TODO: A user should be able to protect some of their metadata from
 * being viewed by another user. Some things are seperate from metadata
 * like name, username, icon, color, etc. tho.
 */

const getUsersById = baseResolver.createResolver(
  async (root, args, context, info) => {
    let users = args.userIdentifiers;
    users = users.map(user => User.find({ where: { id: user } }));
    const userModelResults = await Promise.all(users);
    return userModelResults;
  }
);

const getUsersByName = baseResolver.createResolver(
  async (root, args, context, info) => {
    let users = args.userIdentifiers;
    users = users.map(user => User.find({ where: { username: user } }));
    const userModelResults = await Promise.all(users);
    return userModelResults;
  }
);

export default {
  Query: {
    getUsersById,
    getUsersByName,
  },
};
