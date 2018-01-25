import { makeExecutableSchema, addMockFunctionsToSchema } from "graphql-tools"
// import mocks from "./mocks"
import resolvers from "./resolvers"

const typeDefs = `

type FriendRequest {
  id: ID!
  fromUser: User!,
  toUser: User!,
  message: String,
  createdAt: String,
}

type User {
  id: ID!
  token: String
  name: String
  username: String
  description: String
  iconUrl: String
  friends: [User]
  groups: [Group]
  friendRequests: [FriendRequest]
  allMessages: [Message]
}

type Chat {
  id: ID!
  name: String!
  messages: [Message]
}

type Message {
  id: ID!
  chatId: ID!
  content: Content
}

type Content {
  type: String!
  data: String!
}

type Group {
  id: ID!
  iconUrl: String
  name: String
  description: String
  chats: [Chat]
}

type Subscription {
  newFriendRequest(toUserId: ID): FriendRequest
}

type Query {
  User(id: ID!): User
  users(
    phrase: String!
  ): [User]

  Group(id: ID!): Group

  Chat(id: ID!): Chat
}

type Mutation {
  createUser(
    email: String,
    phone_number: String
    username: String,
    password: String,
    name: String,
    description: String,
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

  createFriendRequest(
    message: String,
    fromUserId: ID!,
    toUserId: ID!,
  ): String

  acceptFriendRequest(
    friendRequestId: ID!,
  ): String

  createGroupRequest(
    message: String!,
    fromUserId: ID!,
    toUserId: ID!,
  ): String

  createGroupInvitation(
    message: String!,
    fromUserId: ID!,
    toUserId: ID!,
    forGroupId: ID!
  ): String
}
`

const schema = makeExecutableSchema({ typeDefs, resolvers })

// addMockFunctionsToSchema({ schema, mocks })

export default schema
