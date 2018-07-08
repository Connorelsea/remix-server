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
    iconUrl:
      "https://is1-ssl.mzstatic.com/image/thumb/Purple128/v4/50/98/b6/5098b62e-b26d-6d0e-bda4-26a85c42fe1f/AppIcon-1x_U007emarketing-0-0-GLES2_U002c0-512MB-sRGB-0-0-0-85-220-0-0-0-3.png/246x0w.jpg",
    ...userFiller,
  },
  {
    name: "Saran Wrap Company",
    username: "saranwrap",
    email: "saranwrap@gmail.com",
    iconUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Liliumbulbiferumflowertop.jpg/220px-Liliumbulbiferumflowertop.jpg",
    ...userFiller,
  },
  {
    name: "sand",
    username: "sand",
    email: "sand@sand.com",
    iconUrl:
      "https://www.publicdomainpictures.net/pictures/10000/velka/1-1254836694ahTH.jpg",
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
