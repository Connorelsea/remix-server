const { ApolloServer, gql } = require("apollo-server");
import { makeExecutableSchema } from "graphql-tools";
import resolvers from "./resolvers/index";

export const typeDefs = gql`
  scalar JSON

  # Requests and Invitations

  type FriendRequest {
    id: ID!
    fromUser: User!
    toUser: User!
    message: String
    createdAt: String
  }

  type GroupInvitation {
    id: ID!
    fromUser: User!
    toUser: User!
    forGroup: Group!
    message: String
    createdAt: String
  }

  type GroupRequest {
    id: ID!
    fromUser: User!
    toUser: User!
    forGroup: Group!
    message: String
    createdAt: String
  }

  type MessageResponse {
    unreadMessageIds: [ID]
    recentMessages: [Message]
  }

  type User {
    id: ID!
    email: String!
    username: String!

    name: String
    description: String
    iconUrl: String
    color: String

    # Associations

    friends: [User]
    groups: [Group]
    allMessages: [Message]
    currentReadPositions: [ReadPosition]

    # Requests and Invitations

    friendRequests: [FriendRequest]
    groupInvitations: [GroupInvitation]
    pendingFriendRequests: [FriendRequest]
    pendingGroupRequests: [GroupRequest]
  }

  type Device {
    id: ID!
    user: User!
    valid: Boolean
    name: String!
    refreshToken: String!
    accessToken: String!
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
    username: String
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

  type SearchResponse {
    friends: [User]
    users: [User]
    groups: [Group]
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
    users(phrase: String!): [User]

    Group(id: ID!): Group

    Chat(id: ID!): Chat

    relevantUsers: [User]
    relevantReadPositions: [ReadPosition]
    unreadMessages: [Message]

    getUsersById(userIdentifiers: [ID]): [User]
    getUsersByName(userIdentifiers: [String]): [User]

    getGroupsById(groupIdentifiers: [ID]): [Group]
    getGroupsByName(groupIdentifiers: [String]): [Group]

    search(phrase: String!): SearchResponse
  }

  type Mutation {
    # User Device Management

    loginWithNewDevice(
      email: String!
      password: String!

      # Device meta needed for device creation
      deviceName: String # Optional, defaults to "Unamed Device"
      operatingSystem: String!
      browser: String!
      cpu: String!
      gpu: String!
    ): Device

    loginWithExistingDevice(
      email: String!
      password: String!
      deviceId: ID!
    ): Device

    createNewDevice(name: String!, password: String!): Device

    # Access and Refresh Token Handling

    getNewAccessToken(refreshToken: String!): Device

    getNewRefreshToken(
      refreshToken: String!
      email: String!
      password: String!
    ): Device

    # Activity

    newActivity(
      type: String!

      # Optional Activity Properties
      downloadLevel: String
      batteryLevel: String
      latitude: String
      longitude: String
    ): Device

    # Creation mutations

    createUser(
      email: String
      username: String
      password: String
      name: String
      description: String
      color: String
      iconUrl: String
    ): Device

    createGroup(
      iconUrl: String
      name: String
      username: String
      description: String
    ): Group

    createChat(inGroupId: ID!, name: String!, description: String): Chat

    # Friend Requests

    createFriendRequest(
      message: String
      fromUserId: ID!
      toUserId: ID!
    ): FriendRequest

    acceptFriendRequest(friendRequestId: ID!): Boolean

    # Group Requests

    createGroupRequest(
      message: String
      fromUserId: ID!
      toUserId: ID!
    ): GroupRequest

    # Group Invitations

    createGroupInvitation(
      message: String
      fromUserId: ID!
      toUserId: ID!
      forGroupId: ID!
    ): GroupInvitation

    acceptGroupInvitation(invitationId: ID!): Group

    # Create a message with original content and send
    # in a specific chat

    createMessage(type: String!, data: JSON!, chatId: ID!): Message

    # Create a message under your authorship in toChatId that sends
    # content of an arbitrary authorship (either yours or another users).
    # The concept of sending a different user's content is used for
    # quoting/replying/forwarding

    createMessageWithExistingContent(contentId: ID!, toChatId: ID!): Message

    # TODO: Expose API for bulk sending
    # Pass content ID or custom NEW content for each message in array

    # Updating read position

    updateReadPosition(forMessageId: ID!): ReadPosition
  }

`;

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});
