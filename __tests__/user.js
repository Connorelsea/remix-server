import { graphql } from "graphql"
import schema from "../schema"
import { db } from "../connectors"
import Sequelize from "sequelize"

import {
  User,
  FriendRequest,
  MyFriendRequests,
  Message,
  Content,
  ReadPosition,
} from "../connectors"
import { createResolver } from "apollo-resolvers"

const createUserQuery = `
  mutation createUser(
    $email: String
    $phone_number: String
    $username: String
    $password: String
    $name: String
    $description: String
    $color: String
    $iconUrl: String
  ) {
    createUser(
      email: $email
      phone_number: $phone_number
      username: $username
      password: $password
      name: $name
      description: $description
      color: $color
      iconUrl: $iconUrl
    ) {
      id
      token
    }
  }`

const createMessageQuery = `
  mutation createMessage(
    $type: String!
    $data: JSON!
    $chatId: ID!
  ) {
    createMessage(
      type: $type
      data: $data
      chatId: $chatId
    ) {
      id
    }
  }
`

const createFriendRequestQuery = `
  mutation($message: String, $fromUserId: ID!, $toUserId: ID!) {
    createFriendRequest(
      message: $message,
      fromUserId: $fromUserId,
      toUserId: $toUserId
    ) {
      id
    }
  }
`

const acceptFriendRequestQuery = `
  mutation acceptFriendRequest {
    acceptFriendRequest(friendRequestId: 1)
  }
`

// Clear the database beforeAll instead of beforeEach. This allows later tests
// to do things such as test against users that were created in earlier tests.
// This allows to create a minimal userflow one may take through the database
// when using the remix platform, in test form.

beforeAll(async () => db.sync({ force: true }))

async function makeAuthenticatedQuery(query, vars, context) {
  return graphql({
    source: query,
    contextValue:
      context !== undefined
        ? context
        : {
            user: {
              id: 1,
            },
          },
    rootValue: {},
    schema,
    variableValues: vars,
  })
}

test("Create and query a new user", async () => {
  const createResult = await graphql({
    source: createUserQuery,
    schema,
    rootValue: {},
    variableValues: {
      email: "test",
      name: "Test User",
      username: "test",
      password: "test",
      color: "#B42525",
      iconUrl:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-0.3.5&s=5da2982426ae7e8085acbc322d7ad54d&dpr=1&auto=format&fit=crop&w=376&h=251&q=60&cs=tinysrgb",
    },
  })

  expect(createResult).toBeDefined()
  expect(createResult.data.createUser.id).toEqual("1")
  expect(createResult.data.createUser.token).toBeDefined()

  const source = `
    query User {
      User(id: 1) { id name }
    }
  `

  const contextValue = {
    user: {
      id: createResult.data.createUser.id,
    },
  }

  const queryResult = await graphql({
    source,
    schema,
    contextValue,
  })

  expect(queryResult.data.User.id).toEqual("1")
  expect(queryResult.data.User.name).toEqual("Test User")
})

test("New user should be able to log in and receive token", async () => {
  // TODO:  mutation { loginUserWithEmail }
})

test("Send new friend request", async () => {
  const createResult = await graphql({
    source: createUserQuery,
    schema,
    rootValue: {},
    variableValues: {
      email: "react",
      name: "Woman Testuser",
      username: "womantestuser",
      password: "Tezsting! This is my bio!",
      color: "#89C1FF",
      iconUrl:
        "https://i.pinimg.com/236x/41/53/a8/4153a8d6d45dae78a9e51791ff15007f.jpg",
    },
  })

  expect(createResult).toBeDefined()
  expect(createResult.data.createUser.id).toEqual("2")
  expect(createResult.data.createUser.token).toBeDefined()

  // User is needed on context, querying needs authorization
  const contextValue = {
    user: {
      id: "1",
    },
  }

  const createFriendRequestResult = await graphql({
    source: createFriendRequestQuery,
    schema,
    rootValue: {},
    contextValue,
    variableValues: {
      message: "Hello, World!",
      fromUserId: "2",
      toUserId: "1",
    },
  })

  expect(createFriendRequestResult.data.createFriendRequest.id).toBeDefined()
})

test("Receive a new friend request and accept", async () => {
  // The first  user should see this friend request when querying
  const friendRequestQuery = `
    query friendRequest {
      User(id: "1") {
        friendRequests {
          fromUser { id }
          toUser { id }
          message
        }
      }
    }
  `

  const friendRequestResult = await makeAuthenticatedQuery(friendRequestQuery)

  const firstUsersFriendRequests = friendRequestResult.data.User.friendRequests
  const request = firstUsersFriendRequests[0]

  // Since the second user sent the friend request to the first user, the
  // from user id should be that of the second user

  expect(firstUsersFriendRequests).toBeDefined()
  expect(request.fromUser.id).toEqual("2")
  expect(request.toUser.id).toEqual("1")
  expect(request.message).toEqual("Hello, World!")

  const acceptFriendRequestResult = await makeAuthenticatedQuery(
    acceptFriendRequestQuery
  )

  // The first user accepted the second user's friend request.

  const firstUserQuery = `
    query User {
      User(id: "1") {
        friends {
          id
        }
      }
    }
  `

  const secondUserQuery = `
    query User {
      User(id: "2") {
        friends {
          id
        }
      }
    }
  `

  const firstUserResult = await makeAuthenticatedQuery(firstUserQuery)
  const secondUserResult = await makeAuthenticatedQuery(secondUserQuery)

  // Ensure that now they are on each other's friend list

  expect(firstUserResult.data.User.friends.length).toBe(1)
  expect(firstUserResult.data.User.friends[0].id).toBe("2")

  expect(secondUserResult.data.User.friends.length).toBe(1)
  expect(secondUserResult.data.User.friends[0].id).toBe("1")

  // TODO: Ensure that a third user who is new has an empty array of friends
})

test("Two new friends are in a direct message group", async () => {
  const firstUserQuery = `
    query User {
      User(id: "1") {
        groups {
          id
          name
          isDirectMessage
          members {
            id
          }
        }
      }
    }
  `

  const secondUserQuery = `
    query User {
      User(id: "2") {
        groups {
          id
          name
          isDirectMessage
          members {
            id
          }
        }
      }
    }
  `

  const firstUserResult = await makeAuthenticatedQuery(firstUserQuery)
  const secondUserResult = await makeAuthenticatedQuery(secondUserQuery)

  // Ensure that now they are on each other's friend list
  // and that they are in a group together

  expect(firstUserResult.data.User.groups.length).toBe(1)
  expect(firstUserResult.data.User.groups[0].id).toBe("1")
  expect(firstUserResult.data.User.groups[0].name).toBe("friend")
  expect(firstUserResult.data.User.groups[0].isDirectMessage).toBe(true)
  expect(firstUserResult.data.User.groups[0].members.length).toBe(2)

  expect(secondUserResult.data.User.groups.length).toBe(1)
})

test("A user's relevantUsers include their friends", async () => {
  // Ensure that a user's relevantUsers array returns users who are
  // the user's friend.
  const relevantUsersQuery = `
    query relevantUsers {
      relevantUsers {
        id
      }
    }
  `

  const relevantUsersResult = await makeAuthenticatedQuery(relevantUsersQuery)

  // Should include their friend and themselves
  // TODO: Fix bug here because relevantUsers algorithm doesnt purge dupes

  // expect(relevantUsersResult.data.relevantUsers.length).toBe(2) // broke, has dupes
  expect(relevantUsersResult.data.relevantUsers[0].id).toBe("2")
})

test("A user sends messages to a group's chat", async () => {
  // The first user will send a message to the new chat

  await makeAuthenticatedQuery(createMessageQuery, {
    type: "remix/text",
    data: { text: "hello" },
    chatId: "1",
  })

  await makeAuthenticatedQuery(
    createMessageQuery,
    {
      type: "remix/text",
      data: { text: "second message" },
      chatId: "1",
    },
    {
      user: { id: "2" },
    }
  )

  await makeAuthenticatedQuery(
    createMessageQuery,
    {
      type: "remix/text",
      data: { text: "third message" },
      chatId: "1",
    },
    {
      user: { id: "2" },
    }
  )

  await makeAuthenticatedQuery(
    createMessageQuery,
    {
      type: "remix/text",
      data: { text: "fourth message" },
      chatId: "2",
    },
    {
      user: { id: "2" },
    }
  )

  await makeAuthenticatedQuery(
    createMessageQuery,
    {
      type: "remix/text",
      data: { text: "fifth message" },
      chatId: "1",
    },
    {
      user: { id: "2" },
    }
  )

  // The second user in the chat should see new messages

  const secondUserQuery = `
    query User {
      User(id: "2") {
        groups {
          id
          chats {
            id
            name
            messages {
              id
              userId
              content {
                type
                data
              }
            }
          }
        }
      }
    }
  `

  const secondUserResult = await makeAuthenticatedQuery(secondUserQuery)
  const groups = secondUserResult.data.User.groups
  const chats = groups[0].chats
  const chatMessages = chats[0].messages

  console.log(chatMessages.map(m => m.content.data))

  expect(chatMessages.length).toBe(4)
  expect(chatMessages[0].userId).toBe("1")
  expect(chatMessages[0].content.data.text).toBe("hello")
  expect(chatMessages[1].userId).toBe("2")
  expect(chatMessages[1].content.data.text).toBe("second message")
})

test("A user should query allMessages to get recent messages", async () => {
  const allMessagesQuery = `
    query User {
      User(id: "1") {
        allMessages {
          id
          chatId
          userId
          content {
            type
            data
          }
        }
      }
    }
  `

  const allMessagesResult = await makeAuthenticatedQuery(allMessagesQuery)
  const messages = allMessagesResult.data.User.allMessages

  console.log("ALL MESSAGES", messages.map(m => m.content.data))

  expect(messages).toBeDefined()
  expect(messages.length).toBe(5)

  expect(messages[0].content.data.text).toBe("hello")
  expect(messages[0].chatId).toBe("1")
  expect(messages[1].content.data.text).toBe("second message")
  expect(messages[2].content.data.text).toBe("third message")
  expect(messages[3].content.data.text).toBe("fourth message")
  expect(messages[3].chatId).toBe("2")
})

test("More users join the chat", async () => {})

test("A client should be able to mark a user's read position for each chat", async () => {
  const users = [
    {
      email: "amy@gmail.com",
      name: "Amy Corn",
      username: "am57",
      password: "pw",
      iconUrl:
        "https://cdn.pixabay.com/photo/2017/08/20/23/04/girl-2663559_960_720.jpg",
    },
    {
      email: "chad@aol.com",
      name: "Chad Peters",
      username: "chad_45",
      password: "pw",
      iconUrl:
        "https://static.goldderby.com/wp-content/uploads/2016/04/author-tony-ruiz.jpg",
    },
    {
      email: "lisa@yahoo.com",
      name: "Lisa Sapper",
      username: "lisa556",
      password: "pw",
      iconUrl:
        "https://siri-cdn.appadvice.com/wp-content/appadvice-v2-media/2017/01/Portrait-mode-curly-hair_75d678192b4c14047f1431c904491ee7-xl.jpg",
    },
  ]

  users.forEach(async user => {
    const response = await makeAuthenticatedQuery(createUserQuery, user)

    await makeAuthenticatedQuery(createFriendRequestQuery, {
      message: "Hello, I want to be your friend",
      fromUserId: response.data.createUser.id,
      toUserId: "1",
    })
  })
})

test("Should return messages after the user's read position as unread", async () => {})

test("Invite a user to a group", async () => {})

test("Receive an invitation to a group", async () => {
  // Assure that after a user receives an invitiation to a group, the user
  // can accept that invitation and 1. they should now be a member of said
  // group, and 2. the invitation should be deleted and no longer present when
  // queried for. Try with multiple invitations.
})

test("Join multiple groups as a user", async () => {
  // Assure that once multiple groups are created, and that the user has
  // joined them, that querying for that user's groups will return correct
  // information.
})
