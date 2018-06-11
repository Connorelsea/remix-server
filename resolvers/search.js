import Sequelize from "sequelize";
import { User, Group } from "../connectors";
import { createError } from "apollo-errors";
import { isAuthenticatedResolver } from "./access";

const Op = Sequelize.Op;

const IncorrectUserError = createError("EmptySearchPhrase", {
  message: "The search phrase is an empty string",
});

const search = isAuthenticatedResolver.createResolver(
  async (root, args, context, info) => {
    const { phrase } = args;

    const { user } = context;

    if (!phrase || phrase.trim() === "") throw new IncorrectUserError();

    let users = User.findAll({
      where: {
        [Op.or]: [
          {
            username: {
              [Op.iLike]: `%${phrase}%`,
            },
          },
          {
            name: {
              [Op.iLike]: `%${phrase}%`,
            },
          },
        ],
      },
    });

    let groups = Group.findAll({
      where: {
        [Op.or]: [
          {
            username: {
              [Op.iLike]: `%${phrase}%`,
            },
          },
          {
            name: {
              [Op.iLike]: `%${phrase}%`,
            },
          },
        ],
      },
    });

    let results = await Promise.all([users, groups]);

    return {
      users: results[0],
      groups: results[1],
    };
  }
);

export default {
  Mutation: {},
  Query: {
    search,
  },
  Subscription: {},
};
