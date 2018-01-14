import { makeExecutableSchema, addMockFunctionsToSchema } from "graphql-tools"
// import mocks from "./mocks"
import resolvers from "./resolvers"

const typeDefs = `
type User {
  id: String,
  token: String
}

type Query {
  friends: [User]
}

type Mutation {
  createUser(
    name: String,
    username: String,
    password: String,
    description: String,
    email: String,
    phone_number: String
  ): User

  loginUserWithEmail(
    email: String!,
    password: String!
  ): User

  loginUserWithPhone(
    phone_number: String!,
    password: String!
  ): User

  createGroup(
    name: String,
    username: String
  ): String
}
`

const schema = makeExecutableSchema({ typeDefs, resolvers })

// addMockFunctionsToSchema({ schema, mocks })

export default schema
