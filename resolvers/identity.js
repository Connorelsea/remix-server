import { baseResolver } from "./base";
import { User } from "../connectors";

const getUsers = baseResolver.createResolver(
  async (root, args, context, info) => {
    let users = args.users;
    users = users.map(user => User.find({ where: { id: user } }));
    const userModelResults = await Promise.all(users);
    return userModelResults;
  }
);

export default {
  Query: {
    getUsers
  }
};
