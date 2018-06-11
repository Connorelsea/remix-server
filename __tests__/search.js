import { graphql } from "graphql";
import { schema } from "../schema";
import { db } from "../connectors";
import Sequelize from "sequelize";
import bcrypt from "bcrypt";

import {
  User,
  FriendRequest,
  MyFriendRequests,
  Message,
  Content,
  ReadPosition,
} from "../connectors";

import { createResolver } from "apollo-resolvers";

async function makeAuthenticatedQuery(query, vars, context) {
  return graphql({
    source: query,
    contextValue:
      context !== undefined
        ? context
        : {
            user: {
              id: 2,
            },
          },
    rootValue: {},
    schema,
    variableValues: vars,
  });
}

const createUserQuery = `
  mutation createUser(
    $email: String
    $username: String
    $password: String
    $name: String
    $description: String
    $color: String
    $iconUrl: String
  ) {
    createUser(
      email: $email
      username: $username
      password: $password
      name: $name
      description: $description
      color: $color
      iconUrl: $iconUrl
    ) {
      id
      user {
        id
        name
        email
      }
      refreshToken
      accessToken
    }
  }`;

const searchQuery = `
  query search($phrase: String!) {
    search(phrase: $phrase) {
      users {
        id
        name
        username
      }
      groups {
        id
        name
        username
      }
    }
  }
`;

const userFiller = { description: "", password: "test", color: "#B42425" };

const users = [
  {
    name: "Sarah",
    username: "sarah",
    email: "sarah@sarah.com",
    ...userFiller,
  },
  {
    name: "Saran Wrap Company",
    username: "saranwrap",
    email: "saranwrap@gmail.com",
    ...userFiller,
  },
  {
    name: "sand",
    username: "sand",
    email: "sand@sand.com",
    ...userFiller,
  },
];

describe("Search for users and groups", function() {
  beforeAll(async function() {
    return Promise.all(
      users.map(user => makeAuthenticatedQuery(createUserQuery, user))
    );
  });

  test("should return similarly named users", async function() {
    const searchQueryVariables = {
      phrase: "sa",
    };

    const searchQueryResponse = await makeAuthenticatedQuery(
      searchQuery,
      searchQueryVariables
    );

    console.log(JSON.stringify(searchQueryResponse, null, 2));
  });
});
