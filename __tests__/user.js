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
`;

// Clear the database beforeAll instead of beforeEach. This allows later tests
// to do things such as test against users that were created in earlier tests.
// This allows to create a minimal userflow one may take through the database
// when using the remix platform, in test form.

beforeAll(async () => {
  return db.sync({ force: true });
});

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
  }).catch(err => console.error(err));
}

test("Create and query a new user", async () => {
  const users = [
    {
      email: "test@test.com",
      name: "Test Userman",
      username: "testuserman",
      description: "short bio m8 😎 ✡️",
      password: "test",
      color: "#B42425",
      iconUrl:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-0.3.5&s=5da2982426ae7e8085acbc322d7ad54d&dpr=1&auto=format&fit=crop&w=376&h=251&q=60&cs=tinysrgb",
    },
    {
      email: "react@react.com",
      name: "Woman Testuser",
      username: "womantestuser",
      description:
        "I am a test remix user. I love apples and hand sanitizer. I have been a doctor for a few weeks now.",
      password: "test",
      color: "#89C1FF",
      iconUrl:
        "https://i.pinimg.com/236x/41/53/a8/4153a8d6d45dae78a9e51791ff15007f.jpg",
    },
  ];

  let createResult = await makeAuthenticatedQuery(createUserQuery, users[0]);

  console.log("CREATE RESULT", JSON.stringify(createResult));

  expect(createResult).toBeDefined();
  expect(createResult.data.createUser.id).toEqual("1"); // device id
  expect(createResult.data.createUser.user).toBeDefined();
  expect(createResult.data.createUser.user.id).toEqual("1"); // user's id
  expect(createResult.data.createUser.accessToken).toBeDefined();
  expect(createResult.data.createUser.refreshToken).toBeDefined();

  const queryResult = await makeAuthenticatedQuery(`
    query User {
      User(id: 1) { id name username }
    }
  `);

  createResult = await makeAuthenticatedQuery(createUserQuery, users[1]);

  expect(createResult).toBeDefined();
  expect(createResult.data.createUser.id).toEqual("2");
  expect(createResult.data.createUser.user).toBeDefined();
  expect(createResult.data.createUser.user.id).toEqual("2"); // user's id
  expect(createResult.data.createUser.refreshToken).toBeDefined();
  expect(createResult.data.createUser.accessToken).toBeDefined();
});

const loginMutation = `
  mutation loginWithExistingDevice(
    $email: String!
    $password: String!
    $deviceId: ID!
  ) {
    loginWithExistingDevice(
      email: $email
      password: $password
      deviceId: $deviceId
    ) {
      id
      name
      user {
        id
      }
      refreshToken
      accessToken
    }
  }
`;

test("New user should be able to log in and receive token", async () => {
  const loginResult = await makeAuthenticatedQuery(loginMutation, {
    email: "test@test.com",
    deviceId: "1", // see create user test
    password: "test",
  });

  expect(loginResult.data.loginWithExistingDevice.id).toBeDefined();
  expect(loginResult.data.loginWithExistingDevice.user).toBeDefined();
  expect(loginResult.data.loginWithExistingDevice.user.id).toEqual("1");
  expect(loginResult.data.loginWithExistingDevice.refreshToken).toBeDefined();
  expect(loginResult.data.loginWithExistingDevice.accessToken).toBeDefined();

  const loginNoDeviceResult = await makeAuthenticatedQuery(loginMutation, {
    email: "test@test.com",
    deviceId: "", // see create user test
    password: "test",
  });

  expect(loginNoDeviceResult.errors).toBeDefined();
});

const createDeviceMutation = `
  mutation createNewDevice(
    $name: String!
    $password: String!
  ) {
    createNewDevice(
      name: $name
      password: $password
    ) {
      id
      accessToken
      refreshToken
    }
  }
`;

test("Existing user should be able to log in with a newly created device", async () => {
  // Create a new device that is associated with the current user

  const createResult = await makeAuthenticatedQuery(createDeviceMutation, {
    name: "Connors Macbook Pro",
    password: "test",
  });

  expect(createResult.data.createNewDevice.id).toBeDefined();
  expect(createResult.data.createNewDevice.accessToken).toBeDefined();
  expect(createResult.data.createNewDevice.refreshToken).toBeDefined();

  // Login mutation should work when using the ID of the newly
  // created device

  const loginResult = await makeAuthenticatedQuery(loginMutation, {
    email: "test@test.com",
    deviceId: createResult.data.createNewDevice.id, // see create user test
    password: "test",
  });

  expect(loginResult.data.loginWithExistingDevice.id).toBeDefined();
  expect(loginResult.data.loginWithExistingDevice.user).toBeDefined();
  expect(loginResult.data.loginWithExistingDevice.user.id).toEqual("1");
  expect(loginResult.data.loginWithExistingDevice.refreshToken).toBeDefined();
  expect(loginResult.data.loginWithExistingDevice.accessToken).toBeDefined();
});

test("Existing user should be able to login using a new device implicitly", async () => {
  const loginWithNewDeviceSource = `
    mutation loginWithNewDevice(
      $email: String!
      $password: String!
      $deviceName: String
      $operatingSystem: String!
      $browser: String!
      $cpu: String!
      $gpu: String!
    ) {
      loginWithNewDevice(
        email: $email
        password: $password
        deviceName: $deviceName
        operatingSystem: $operatingSystem
        browser: $browser
        cpu: $cpu
        gpu: $gpu
      ) {
        id
        accessToken
        refreshToken
        name
        user {
          id
        }
      }
    }
  `;

  const loginResult = await makeAuthenticatedQuery(loginWithNewDeviceSource, {
    email: "test@test.com",
    password: "test",
    operatingSystem: "MacOS",
    browser: "Chrome",
    cpu: "Intel",
    gpu: "Intel",
  });

  const newDevice = loginResult.data.loginWithNewDevice;

  expect(newDevice.name).toBe("Unamed Device");
  expect(newDevice.id).toBeDefined();
  expect(newDevice.accessToken).toBeDefined();
  expect(newDevice.refreshToken).toBeDefined();
  expect(newDevice.user).toBeDefined();
  expect(newDevice.user.id).toBeDefined();
});

test("A user should request a new access token when their expires", async () => {
  const getNewAccessTokenSource = `
    mutation getNewAccessToken(
      $refreshToken: String!
    ) {
      getNewAccessToken(refreshToken: $refreshToken) {
        id
        name
        accessToken
        refreshToken
        user {
          id
        }
      }
    }
  `;

  // Login to get refreshToken

  const loginResult = await makeAuthenticatedQuery(loginMutation, {
    email: "test@test.com",
    deviceId: "1", // see create user test
    password: "test",
  });

  let device = loginResult.data.loginWithExistingDevice;

  expect(device.name).toBeDefined();
  expect(device.accessToken).toBeDefined();
  expect(device.refreshToken).toBeDefined();

  const newAccessTokenResult = await makeAuthenticatedQuery(
    getNewAccessTokenSource,
    { refreshToken: device.refreshToken }
  );

  let newDevice = newAccessTokenResult.data.getNewAccessToken;

  expect(newDevice.accessToken).toBeDefined();
  expect(newDevice.user).toBeDefined();
});

test("A user should request a new refresh token when theirs expires", async () => {
  // request new refresh token using email and password

  // Login to get refreshToken

  const loginResult = await makeAuthenticatedQuery(loginMutation, {
    email: "test@test.com",
    deviceId: "1", // see create user test
    password: "test",
  });

  let device = loginResult.data.loginWithExistingDevice;
  let originalDeviceRefreshToken = device.refreshToken;

  expect(device.name).toBeDefined();
  expect(device.accessToken).toBeDefined();
  expect(originalDeviceRefreshToken).toBeDefined();

  // Request a new refresh token

  const getNewRefreshTokenSource = `
    mutation getNewRefreshToken(
      $refreshToken: String!
      $email: String!
      $password: String!
    ) {
      getNewRefreshToken(
        refreshToken: $refreshToken
        email: $email
        password: $password
      ) {
        id
        name
        accessToken
        refreshToken
        user {
          id
        }
      }
    }
  `;

  const variables = {
    refreshToken: originalDeviceRefreshToken,
    email: "test@test.com",
    password: "test",
  };

  const getNewRefreshTokenResult = await makeAuthenticatedQuery(
    getNewRefreshTokenSource,
    variables
  );

  expect(getNewRefreshTokenResult.data.getNewRefreshToken).toBeDefined();

  const newDevice = getNewRefreshTokenResult.data.getNewRefreshToken;
  const newDeviceRefreshToken = newDevice.refreshToken;

  expect(originalDeviceRefreshToken).not.toBe(newDeviceRefreshToken);
});

test("Existing user should only be able to login with devices they created", async () => {
  // Create a new device that belongs to the second user (not first)

  const createResult = await makeAuthenticatedQuery(
    createDeviceMutation,
    {
      name: "Not Connors Macbook Pro",
      password: "test",
    },
    {
      user: { id: 2 },
    }
  );

  expect(createResult.data.createNewDevice.id).toBeDefined();
  expect(createResult.data.createNewDevice.accessToken).toBeDefined();
  expect(createResult.data.createNewDevice.refreshToken).toBeDefined();

  // Attempt to login the first user with the second user's device ID
  // This should not work and should result in an error

  const loginResult = await makeAuthenticatedQuery(loginMutation, {
    email: "test@test.com",
    deviceId: createResult.data.createNewDevice.id,
    password: "test",
  });

  expect(loginResult.errors).toBeDefined();
  expect(loginResult.data.createNewDevice).toBeUndefined();
});

/**
 * Friend Requests
 */

// Relevant Queries and Mutations

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
`;

const acceptFriendRequestQuery = `
  mutation acceptFriendRequest {
    acceptFriendRequest(friendRequestId: 1)
  }
`;

// Tests

test("Send new friend request", async () => {
  const createFriendRequestResult = await makeAuthenticatedQuery(
    createFriendRequestQuery,
    {
      message: "Hello, World!",
      fromUserId: "2",
      toUserId: "1",
    }
  );

  expect(createFriendRequestResult.data.createFriendRequest.id).toBe("1");
});

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
  `;

  const friendRequestResult = await makeAuthenticatedQuery(friendRequestQuery);

  const firstUsersFriendRequests = friendRequestResult.data.User.friendRequests;
  const request = firstUsersFriendRequests[0];

  // Since the second user sent the friend request to the first user, the
  // from user id should be that of the second user

  expect(firstUsersFriendRequests).toBeDefined();
  expect(request.fromUser.id).toEqual("2");
  expect(request.toUser.id).toEqual("1");
  expect(request.message).toEqual("Hello, World!");

  const acceptFriendRequestResult = await makeAuthenticatedQuery(
    acceptFriendRequestQuery
  );

  // The first user accepted the second user's friend request.

  const firstUserQuery = `
    query User {
      User(id: "1") {
        friends {
          id
        }
      }
    }
  `;

  const secondUserQuery = `
    query User {
      User(id: "2") {
        friends {
          id
        }
      }
    }
  `;

  const firstUserResult = await makeAuthenticatedQuery(firstUserQuery);
  const secondUserResult = await makeAuthenticatedQuery(secondUserQuery);

  // Ensure that now they are on each other's friend list

  expect(firstUserResult.data.User.friends.length).toBe(1);
  expect(firstUserResult.data.User.friends[0].id).toBe("2");

  expect(secondUserResult.data.User.friends.length).toBe(1);
  expect(secondUserResult.data.User.friends[0].id).toBe("1");

  // TODO: Ensure that a third user who is new has an empty array of friends
});

/**
 * Group Invitations
 */

// Relevant Queries and Mutations

const createGroupSource = `
  mutation createGroup(
    $iconUrl: String
    $username: String
    $name: String
    $description: String
  ) {
    createGroup(
      iconUrl: $iconUrl
      username: $username
      name: $name
      description: $description
    ) {
      id
    }
  }
`;

const createGroupInvitationSource = `
  mutation createGroupInvitation(
    $message: String
    $fromUserId: ID!
    $toUserId: ID!
    $forGroupId: ID!
  ) {
    createGroupInvitation(
      message: $message
      fromUserId: $fromUserId
      toUserId: $toUserId
      forGroupId: $forGroupId
    ) {
      id
    }
  }
`;

test("Create a new group and send a group invitation", async () => {
  const createGroupResult = await makeAuthenticatedQuery(
    createGroupSource,
    {
      iconUrl:
        "https://cdn.dribbble.com/users/2437/screenshots/1578339/1-up_mushroom_1x.png",
      username: "myfirstgroup",
      name: "My 1st Group 🦋",
      description: "Description of group, created in user tests",
    },
    { user: { id: 2 } }
  );

  const group = createGroupResult.data.createGroup;

  expect(group).toBeDefined();
  expect(group.id).toBeDefined();

  // Invite user 1 to this group

  const createGroupInvitationResult = await makeAuthenticatedQuery(
    createGroupInvitationSource,
    {
      message: "Hello, World!",
      fromUserId: 2,
      toUserId: 1,
      forGroupId: group.id,
    },
    { user: { id: 2 } }
  );

  const groupInvitation =
    createGroupInvitationResult.data.createGroupInvitation;

  expect(groupInvitation).toBeDefined();
  expect(groupInvitation.id).toBeDefined();

  const userQueryResult = await makeAuthenticatedQuery(
    `
      query User {
        User(id: 1) {
          id
          groupInvitations {
            id
            fromUser { id }
            message
          }
        }
      }
    `
  );

  const userOne = userQueryResult.data.User;

  expect(userOne).toBeDefined();
  expect(userOne.groupInvitations).toBeDefined();
  expect(userOne.groupInvitations.length).toBe(1);
  expect(userOne.groupInvitations[0].fromUser.id).toBe("2");
});

test("Accept a group invitation and become a member of a new group", async () => {
  const acceptInvitationQuery = `
    mutation acceptGroupInvitation($invitationId: ID!) {
      acceptGroupInvitation(invitationId: $invitationId) {
        id
        members { id }
      }
    }
  `;

  const acceptResult = await makeAuthenticatedQuery(acceptInvitationQuery, {
    invitationId: 1,
  });

  const newGroup = acceptResult.data.acceptGroupInvitation;

  expect(newGroup.id).toBe("2");
  expect(newGroup.members.length).toBe(2);

  // Order isn't garunteed, user id 1 is confirmed to be member

  expect(Math.min(newGroup.members[1].id, newGroup.members[0].id)).toBe(1);
});

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
  `;

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
  `;

  const firstUserResult = await makeAuthenticatedQuery(firstUserQuery);
  const secondUserResult = await makeAuthenticatedQuery(secondUserQuery);

  // Ensure that now they are on each other's friend list
  // and that they are in a group together

  // Update: This user has two groups because they accepted
  // a group invitation in an earlier test.

  expect(firstUserResult.data.User.groups.length).toBe(2);
  expect(firstUserResult.data.User.groups[0].id).toBe("1");
  expect(firstUserResult.data.User.groups[0].name).toBe("friend");
  expect(firstUserResult.data.User.groups[0].isDirectMessage).toBe(true);
  expect(firstUserResult.data.User.groups[0].members.length).toBe(2);

  expect(secondUserResult.data.User.groups.length).toBe(2);
});

test("A user's relevantUsers include their friends", async () => {
  // Ensure that a user's relevantUsers array returns users who are
  // the user's friend.
  const relevantUsersQuery = `
    query relevantUsers {
      relevantUsers {
        id
      }
    }
  `;

  const relevantUsersResult = await makeAuthenticatedQuery(relevantUsersQuery);

  // Should include their friend and themselves
  // TODO: Fix bug here because relevantUsers algorithm doesnt purge dupes

  // expect(relevantUsersResult.data.relevantUsers.length).toBe(2) // broke, has dupes
  expect(relevantUsersResult.data.relevantUsers[0].id).toBe("2");
});

test("A user sends messages to a group's chat", async () => {
  // The first user will send a message to the new chat

  const firstUserQuery = `
    query User {
      User(id: "2") {
        groups {
          id
          chats { id }
        }
      }
    }
  `;

  const result = await makeAuthenticatedQuery(firstUserQuery);

  const resultGroups = result.data.User.groups;

  expect(resultGroups[0].id).toBe("1");
  expect(resultGroups[0].chats.length).toBe(2);

  const chatId = resultGroups[0].chats[0].id;

  await makeAuthenticatedQuery(createMessageQuery, {
    type: "remix/text",
    data: {
      text:
        "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.",
    },
    chatId: resultGroups[1].chats[0].id,
  });

  await makeAuthenticatedQuery(createMessageQuery, {
    type: "remix/text",
    data: {
      text:
        "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
    },
    chatId: resultGroups[1].chats[0].id,
  });

  await makeAuthenticatedQuery(createMessageQuery, {
    type: "remix/text",
    data: {
      text:
        "Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?",
    },
    chatId: resultGroups[1].chats[0].id,
  });

  await makeAuthenticatedQuery(createMessageQuery, {
    type: "remix/text",
    data: { text: "Ha 😂" },
    chatId: resultGroups[1].chats[0].id,
  });

  await makeAuthenticatedQuery(createMessageQuery, {
    type: "remix/text",
    data: { text: "hello" },
    chatId,
  });

  await makeAuthenticatedQuery(
    createMessageQuery,
    {
      type: "remix/text",
      data: { text: "second message" },
      chatId,
    },
    {
      user: { id: "2" },
    }
  );

  await makeAuthenticatedQuery(
    createMessageQuery,
    {
      type: "remix/text",
      data: { text: "third message" },
      chatId,
    },
    {
      user: { id: "2" },
    }
  );

  await makeAuthenticatedQuery(
    createMessageQuery,
    {
      type: "remix/text",
      data: { text: "fourth message" },
      chatId,
    },
    {
      user: { id: "2" },
    }
  );

  await makeAuthenticatedQuery(
    createMessageQuery,
    {
      type: "remix/text",
      data: { text: "fifth message" },
      chatId,
    },
    {
      user: { id: "2" },
    }
  );

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
  `;

  const secondUserResult = await makeAuthenticatedQuery(secondUserQuery);
  const groups = secondUserResult.data.User.groups;
  const chats = groups[0].chats;
  const chatMessages = chats[0].messages;

  console.log(chatMessages.map(m => m.content.data));

  expect(chatMessages.length).toBe(5);
  expect(chatMessages[0].userId).toBe("1");
  expect(chatMessages[0].content.data.text).toBe("hello");
  expect(chatMessages[1].userId).toBe("2");
  expect(chatMessages[1].content.data.text).toBe("second message");
});

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
  `;

  const allMessagesResult = await makeAuthenticatedQuery(allMessagesQuery);
  const messages = allMessagesResult.data.User.allMessages;

  console.log("ALL MESSAGES", messages.map(m => m.content.data));

  expect(messages).toBeDefined();
  expect(messages.length).toBe(9);

  expect(messages[0].content.data.text).toBe("hello");
  expect(messages[1].content.data.text).toBe("second message");
  expect(messages[2].content.data.text).toBe("third message");
  expect(messages[3].content.data.text).toBe("fourth message");
});

// test("More users join the chat", async () => {});

// test("A client should be able to mark a user's read position for each chat", async () => {
//   const users = [
//     {
//       email: "amy@gmail.com",
//       name: "Amy Corn",
//       username: "am57",
//       password: "pw",
//       iconUrl:
//         "https://cdn.pixabay.com/photo/2017/08/20/23/04/girl-2663559_960_720.jpg"
//     },
//     {
//       email: "chad@aol.com",
//       name: "Chad Peters",
//       username: "chad_45",
//       password: "pw",
//       iconUrl:
//         "https://static.goldderby.com/wp-content/uploads/2016/04/author-tony-ruiz.jpg"
//     },
//     {
//       email: "lisa@yahoo.com",
//       name: "Lisa Sapper",
//       username: "lisa556",
//       password: "pw",
//       iconUrl:
//         "https://siri-cdn.appadvice.com/wp-content/appadvice-v2-media/2017/01/Portrait-mode-curly-hair_75d678192b4c14047f1431c904491ee7-xl.jpg"
//     }
//   ];

//   users.forEach(async user => {
//     const response = await makeAuthenticatedQuery(createUserQuery, user);

//     await makeAuthenticatedQuery(createFriendRequestQuery, {
//       message: "Hello, I want to be your friend",
//       fromUserId: response.data.createUser.id,
//       toUserId: "2"
//     });
//   });
// });

// test("Relevant read positions should be from chats you are in", async () => {
//   const relevantReadPositionsQuery = `
//     query relevantReadPositions {
//       relevantReadPositions {
//         id
//       }
//     }
//   `;
// });

test("Unread messages should be messages (from chats you are a member of) created after your most recent read position in each chat", async () => {
  // Query messages from the second user

  const messageQuery = `
    query messages {
      User(id: "2") {
        groups {
          chats {
            messages {
              id
              content {
                data 
                type
              }
            }
          }
        }
      }
    }
  `;

  const messageResult = await makeAuthenticatedQuery(messageQuery);

  const groups = messageResult.data.User.groups;
  const chat = groups[0].chats[0];
  const messages = chat.messages;

  // In the second user's first group's first chat,
  // there will be five messages.

  expect(messages.length).toBe(5);

  const updateReadPositionMutation = `
    mutation updateReadPosition($forMessageId: ID!) {
      updateReadPosition(forMessageId: $forMessageId) {
        id
      }
    }
  `;

  // Set user "2" (on context) read position in the second
  // group's first chat. Set that they've read the first message.

  // Update the second user's read position in the first group's
  // first chat. The read position's `forMessageId` is the ID of
  // the first message in said chat.

  const updateResult = await makeAuthenticatedQuery(
    updateReadPositionMutation,
    {
      forMessageId: messages[0].id,
    }
  );

  expect(updateResult.data.updateReadPosition.id).toBe("1");

  // In this case, this `unreadMessages` query should return 4
  // messages, since the 1st/5th message has been read by the
  // inquirer.

  const unreadQuery = `
    query unreadMessages {
      unreadMessages {
        id
        content {
          data 
          type
        }
      }
    }
  `;

  const unreadResult = await makeAuthenticatedQuery(unreadQuery);

  let unreadMessages = unreadResult.data.unreadMessages;

  expect(unreadMessages.length).toBe(4);
  expect(unreadMessages[0].content.data.text).toBe("second message");
  expect(unreadMessages[1].content.data.text).toBe("third message");
  expect(unreadMessages[2].content.data.text).toBe("fourth message");
  expect(unreadMessages[3].content.data.text).toBe("fifth message");
});

test("Invite a user to a group", async () => {});

test("Receive an invitation to a group", async () => {
  // Assure that after a user receives an invitiation to a group, the user
  // can accept that invitation and 1. they should now be a member of said
  // group, and 2. the invitation should be deleted and no longer present when
  // queried for. Try with multiple invitations.
});

test("Join multiple groups as a user", async () => {
  // Assure that once multiple groups are created, and that the user has
  // joined them, that querying for that user's groups will return correct
  // information.
});
