import { graphql } from "graphql";
import schema from "../schema";
import { db } from "../connectors";
import Sequelize from "sequelize";
import bcrypt from "bcrypt";

import {
  User,
  FriendRequest,
  MyFriendRequests,
  Message,
  Content,
  ReadPosition
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
              id: 2
            }
          },
    rootValue: {},
    schema,
    variableValues: vars
  });
}

const createGroup = `
  mutation createGroup(
    $iconUrl: String
    $name: String
    $description: String
  ) {
    createGroup(
      iconUrl: $iconUrl
      name: $name
      description: $description
    ) {
      id
      members {
        id
      }
      chats {
        id
        name
      }
    }
  }
`;

describe("Any user can create a new group", function() {
  let group;

  beforeAll(async function() {
    const response = await makeAuthenticatedQuery(createGroup, {
      iconUrl:
        "https://cdn.dribbble.com/users/2437/screenshots/1578339/1-up_mushroom_1x.png",
      name: "MyGroup",
      description: "Description of group"
    });
    group = response.data.createGroup;
  });

  it("should exist", () => {
    expect(group).toBeDefined();
    expect(group.id).toBeDefined();
  });

  it("should have one member, the creator", () => {
    expect(group.members).toBeDefined();
    expect(group.members.length).toBe(1);
    expect(group.members[0].id).toBe("2");
  });

  it("should have one default chat", () => {
    expect(group.chats).toBeDefined();
    expect(group.chats[0].name).toBe("general");
  });
});

// describe("Creating44 a new group", async function() {
//   const group = await makeAuthenticatedQuery(createGroup, {
//     iconUrl: "",
//     name: "",
//     description: ""
//   });

//   test("should exist", function() {
//     expect(group.id).toBeUndefined();
//   });
// });
