import { makeExecutableSchema, addMockFunctionsToSchema } from "graphql-tools"
// import mocks from "./mocks"
import resolvers from "./resolvers"

const typeDefs = `

scalar JSON

type FriendRequest {
  id: ID!
  fromUser: User!
  toUser: User!
  message: String
  createdAt: String
}

type MessageResponse {
  unreadMessageIds: [ID]
  recentMessages: [Message]
}

type User {
  id: ID!
  token: String
  name: String
  username: String
  description: String
  iconUrl: String
  color: String
  friends: [User]
  groups: [Group]
  friendRequests: [FriendRequest]
  allMessages: [Message]
  currentReadPositions: [ReadPosition]
}

type Device {
  id: ID!
  userId: ID!
  name: String
  valid: Boolean
  refreshToken: String
  accessToken: String
}

type ReadPosition {
  id: ID!
  userId: ID!
  chatId: ID!
  messageId: ID!
  atChatTime: String!
}

type Chat {
  id: ID!
  description: String
  name: String!
  messages: [Message]
}

type Message {
  createdAt: String
  id: ID!
  chatId: ID!
  userId: ID!
  content: Content
  readPositions: [ReadPosition]
}

type Content {
  type: String!
  data: JSON!
}

type Group {
  id: ID!
  iconUrl: String
  name: String
  description: String
  isDirectMessage: Boolean
  chats: [Chat]
  members: [User]
}

type NewFriendResponse {
  newUser: User!
  newGroup: Group!
}

type Subscription {
  newFriendRequest(toUserId: ID): FriendRequest
  newFriend(forUserId: ID!): NewFriendResponse
  newMessage(forUserId: ID!): Message
  newGroup(forUserId: ID!): Group
  newReadPosition(forUserId: ID!): ReadPosition
}

type Query {
  User(id: ID!): User
  users(
    phrase: String!
  ): [User]

  Group(id: ID!): Group

  Chat(id: ID!): Chat

  relevantUsers: [User]
  relevantReadPositions: [ReadPosition]
  unreadMessages: [Message]
}

type Mutation {
  createUser(
    email: String,
    username: String,
    password: String,
    name: String,
    description: String,
    color: String,
    iconUrl: String
  ): Device

  loginUserWithEmail(
    deviceId: ID!
    email: String!
    password: String!
  ): Device

  createNewDevice(
    name: String!
    password: String!
  ): Device

  createGroup(
    name: String,
    username: String
  ): String

  createChat(
    inGroupId: ID!
    name: String!
    description: String
  ): Chat

  createFriendRequest(
    message: String,
    fromUserId: ID!,
    toUserId: ID!,
  ): FriendRequest

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

  # Create a message with original content and send
  # in a specific chat

  createMessage(
    type: String!
    data: JSON!
    chatId: ID!
  ): Message

  # Create a message under your authorship in toChatId that sends
  # content of an arbitrary authorship (either yours or another users).
  # The concept of sending a different user's content is used for
  # quoting/replying/forwarding

  createMessageWithExistingContent(
    contentId: ID!
    toChatId: ID!
  ): Message

  # TODO: Expose API for bulk sending
  # Pass content ID or custom NEW content for each message in array

  # Updating read position

  updateReadPosition(
    forMessageId: ID!
  ): ReadPosition
}
`

const schema = makeExecutableSchema({ typeDefs, resolvers })

// addMockFunctionsToSchema({ schema, mocks })

export default schema
