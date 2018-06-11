import Sequelize from "sequelize";
import bcrypt from "bcrypt";

let local = true;

if (process.env.PORT !== undefined) local = false;

console.log("RUNNING WITH LOCAL MODE SET TO " + local);

export const db = local
  ? new Sequelize("remix", "", null, {
      dialect: "postgres",
      pool: {
        max: 10,
        min: 0,
      },
    })
  : new Sequelize(process.env.DATABASE_URL, {
      dialect: "postgres",
    });

export const User = db.define(
  "user",
  {
    iconUrl: {
      type: Sequelize.STRING,
      validate: {
        isUrl: true,
      },
    },
    color: Sequelize.STRING,
    name: Sequelize.STRING,
    username: {
      type: Sequelize.STRING,
      unique: true,
      validate: {
        len: [2, 50],
      },
    },
    password: {
      type: Sequelize.STRING,
      validate: {
        len: [5, 1000],
      },
    },
    description: Sequelize.TEXT,
    email: {
      type: Sequelize.STRING,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
  }
  // {
  //   indexes: [
  //     {
  //       name: "index_user_trigram",
  //       concurrently: true,
  //       method: "gin",
  //       fields: [Sequelize.literal("user gin_trgm_ops")],
  //     },
  //   ],
  // }
);

// An activity object (stream) could have a relation
// to a Device from which device the most recent
// activity was from

export const Device = db.define("device", {
  name: Sequelize.STRING,
  valid: Sequelize.BOOLEAN,
  refreshToken: Sequelize.STRING,
  accessToken: Sequelize.STRING,

  operatingSystem: Sequelize.STRING,
  browser: Sequelize.STRING,
  cpu: Sequelize.STRING,
  gpu: Sequelize.STRING,

  // Settings
  trackActivityLocation: Sequelize.BOOLEAN,
  retainActivityHistoryForTime: Sequelize.STRING,
});

User.belongsToMany(Device, { through: "UserDevices" });
Device.belongsTo(User, { through: "UserDevices" });

/**
 * Tab
 *
 * Tabs are unlike some other objects in the database because
 * tabs will be represented by theoretically different objects
 * on the client and will be bulk syned via a single graphql
 * command. Tabs are related to Device; similar to Activity.
 */

export const Tab = db.define("tab", {
  url: Sequelize.STRING,
  title: Sequelize.STRING,
  subtitle: Sequelize.STRING,
  iconUrl: Sequelize.STRING,
});

Tab.belongsTo(Device, { through: "DeviceTabs" });
Device.belongsToMany(Tab, { through: "DeviceTabs" });

/**
 * Activity
 */

const ActivityTypes = ["online", "inactive", "offline"];

export const Activity = db.define("activity", {
  type: Sequelize.ENUM(...ActivityTypes),
  batteryLevel: Sequelize.STRING,
  latitude: Sequelize.STRING,
  longitude: Sequelize.STRING,
});

// User.belongsTo(Device, { through: "DeviceActivities" });
Activity.belongsTo(Device, { through: "DeviceActivities" });
Device.belongsToMany(Activity, { through: "DeviceActivites" });

export const Group = db.define("group", {
  iconUrl: {
    type: Sequelize.STRING,
    validate: {
      isUrl: true,
    },
  },
  username: {
    type: Sequelize.STRING,
    unique: true,
    validate: {
      len: [2, 50],
    },
  },
  name: Sequelize.STRING,
  description: Sequelize.TEXT,
  isDirectMessage: Sequelize.BOOLEAN,

  // Settings

  // Public - shows in gobal search, can have public chats
  // Private - hidden from search, all chats private
  isPublic: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },

  allowMemberInvites: {
    type: Sequelize.BOOLEAN,
    defaultValue: true,
  },
  allowMemberRequests: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
});

export const Chat = db.define("chat", {
  name: Sequelize.STRING,
  description: Sequelize.TEXT,

  // Any remix user can send a message to a public chat, unless
  // that group has banned them.
  isPublic: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
});

export const Message = db.define("message", {});

const ContentTypes = [
  "remix/text",
  "remix/sticker",
  "remix/image",
  "remix/file",
  "remix/poll",
  "remix/contact",
  "remix/spotify/track",
  "remix/spotify/album",
];

export const Content = db.define("content", {
  type: Sequelize.ENUM(...ContentTypes),
  data: Sequelize.JSON,
});

export const FriendRequest = db.define("friend_request", {
  message: Sequelize.TEXT,
});

export const GroupRequest = db.define("group_request", {
  message: Sequelize.TEXT,
});

export const GroupInvitation = db.define("group_invitation", {
  message: Sequelize.TEXT,
});

// Friends
User.belongsToMany(User, { as: "Friends", through: "UserFriends" });

// Members
User.belongsToMany(Group, { as: "Groups", through: "UserGroups" });
Group.belongsToMany(User, { as: "Members", through: "UserGroups" });

// Admins
Group.belongsToMany(User, { as: "Admins", through: "GroupAdmins" });
User.belongsToMany(Group, { as: "OwnedGroups", through: "GroupAdmins" });

// When a user wants to message another user directly,
// they send a friend request. Once the friend request
// is accepted, the two users can private message.

FriendRequest.belongsTo(User, { as: "fromUser" });
export const MyFriendRequests = FriendRequest.belongsTo(User, { as: "toUser" });

// When a user wants to join a group, they send the group
// a request to join. Once an admin of the group accepts
// the request, the user requesting can partake in group
// chats.

GroupRequest.belongsTo(User, { as: "fromUser" });
GroupRequest.belongsTo(Group, { as: "toGroup" });

// When a member of a group wants to invite another user,
// the group member will send that user a group invitation.

GroupInvitation.belongsTo(User, { as: "fromUser" });
GroupInvitation.belongsTo(Group, { as: "forGroup" });
GroupInvitation.belongsTo(User, { as: "toUser" });

Group.belongsToMany(Chat, { through: "GroupChats" });
Chat.belongsTo(Group, { through: "GroupChats" });
Chat.belongsToMany(Message, { through: "ChatMessages" });
Message.belongsTo(Chat, { through: "ChatMessages" });
Message.belongsTo(User);
Message.hasOne(Content);

// Read positions

export const ReadPosition = db.define("ReadPositions", {
  atChatTime: Sequelize.DATE,
});

ReadPosition.belongsTo(Chat, { through: "ChatReadPositions" });
Chat.belongsToMany(ReadPosition, { through: "ChatReadPositions" });
ReadPosition.belongsTo(Message);
Message.belongsToMany(ReadPosition, {
  through: "ChatReadPositions",
  as: "readPositions",
});
ReadPosition.belongsTo(User);

db.sync();

// db.sync({ force: true }).then(async val => {
//   console.log("Done syncing")

//   const testUser = await User.create({
//     name: "Connor Elsea",
//     username: "connor",
//     description: "testing bio in connectors",
//     password: bcrypt.hashSync("password", 10),
//     email: "connorelsea@gmail.com",
//     phone_number: "2258038302",
//     iconUrl:
//       "https://pbs.twimg.com/profile_images/938193159816929280/TUxW1wek_400x400.jpg",
//     color: "#0f72e0",
//   })

//   const testGroup = await Group.create({
//     iconUrl:
//       "https://static.listionary.com/core/uploads/1467711649-main-sour-patch-kids-IRk.jpg",
//     name: "Sour Patch",
//     description:
//       "The first group to test the groups feature when in Remix development mode",
//   })

//   testUser.addGroup(testGroup)

//   const testChat = await Chat.create({
//     name: "general",
//   })

//   const testRapChat = await Chat.create({
//     name: "rapchat",
//   })

//   testGroup.addChat(testChat)
//   testGroup.addChat(testRapChat)

//   testChat.setGroup(testGroup)
//   testRapChat.setGroup(testGroup)

//   const testMessage = await Message.create(
//     {
//       content: {
//         type: "remix/text",
//         data: { text: "hello" },
//       },
//     },
//     {
//       include: [Content],
//     }
//   )

//   testMessage.setUser(testUser)

//   const testRapMessage = await Message.create(
//     {
//       content: {
//         type: "remix/text",
//         data: { text: "i love rap" },
//       },
//     },
//     {
//       include: [Content],
//     }
//   )

//   testRapMessage.setUser(testUser)

//   testChat.addMessage(testMessage)
//   testMessage.setChat(testChat)
//   testRapChat.addMessage(testRapMessage)
//   testRapMessage.setChat(testRapChat)

//   User.create({
//     name: "Corn Cob",
//     username: "corncob",
//     description: "a corn on the net",
//     password: bcrypt.hashSync("password", 10),
//     email: "corn@gmail.com",
//     phone_number: "2258038302",
//     iconUrl:
//       "https://media1.britannica.com/eb-media/36/167236-004-AE764A76.jpg",
//   })

//   const otherUser = await User.create({
//     name: "test",
//     username: "test",
//     description: "a test on the net",
//     password: bcrypt.hashSync("test", 10),
//     email: "test",
//     phone_number: "2258038302",
//     color: "#D1D5DB",
//     iconUrl:
//       "http://pbs.twimg.com/profile_images/929933611754708992/ioSgz49P_400x400.jpg",
//   })

//   otherUser.addGroup(testGroup)

//   User.create({
//     name: "Jospeh A. Bakington",
//     username: "longusernameaswell",
//     description:
//       "This person has a very long name and a very long username and a very long description.",
//     password: bcrypt.hashSync("test", 10),
//     email: "test",
//     phone_number: "2258038302",
//   })
// })
