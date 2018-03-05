import { graphql } from "graphql"
import schema from "../schema"
import { db } from "../connectors"
import Sequelize from "sequelize"
import bcrypt from "bcrypt"

import {
  User,
  FriendRequest,
  MyFriendRequests,
  Message,
  Content,
  ReadPosition,
} from "../connectors"
import { createResolver } from "apollo-resolvers"

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
  })
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
    }
  }
`

describe("Creating a new group", async function() {
  const group = await makeAuthenticatedQuery(createGroup, {
    iconUrl: "",
    name: "",
    description: "",
  })
})
