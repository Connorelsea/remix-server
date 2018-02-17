import Sequelize from "sequelize"
import bcrypt from "bcrypt"

const local = true

if (process.env.PORT !== undefined) local = false

export const db = local
  ? new Sequelize("remix", "", null, {
      dialect: "postgres",
    })
  : new Sequelize(process.env.DATABASE_URL, {
      dialect: "postgres",
    })

export const User = db.define("user", {
  iconUrl: Sequelize.STRING,
  color: Sequelize.STRING,
  name: Sequelize.STRING,
  username: Sequelize.STRING,
  password: Sequelize.STRING,
  description: Sequelize.TEXT,
  email: Sequelize.STRING,
  phone_number: Sequelize.STRING,
})

export const Group = db.define("group", {
  iconUrl: Sequelize.STRING,
  name: Sequelize.STRING,
  description: Sequelize.TEXT,
  isDirectMessage: Sequelize.BOOLEAN,
})

export const Chat = db.define("chat", {
  name: Sequelize.STRING,
  description: Sequelize.TEXT,
})

export const Message = db.define("message", {})

const ContentTypes = [
  "remix/text",
  "remix/sticker",
  "remix/image",
  "remix/file",
  "remix/poll",
  "remix/contact",
  "remix/spotify/track",
]

export const Content = db.define("content", {
  type: Sequelize.ENUM(...ContentTypes),
  data: Sequelize.JSON,
})

export const FriendRequest = db.define("friend_request", {
  message: Sequelize.TEXT,
})

export const GroupRequest = db.define("group_request", {
  message: Sequelize.TEXT,
})

export const GroupInvitation = db.define("group_invitation", {
  message: Sequelize.TEXT,
})

// Associations

User.belongsToMany(User, { as: "Friends", through: "UserFriends" })
User.belongsToMany(Group, { as: "Groups", through: "UserGroups" })
Group.belongsToMany(User, { as: "Members", through: "UserGroups" })

// When a user wants to message another user directly,
// they send a friend request. Once the friend request
// is accepted, the two users can private message.

FriendRequest.belongsTo(User, { as: "fromUser" })
export const MyFriendRequests = FriendRequest.belongsTo(User, { as: "toUser" })

// When a user wants to join a group, they send the group
// a request to join. Once an admin of the group accepts
// the request, the user requesting can partake in group
// chats.

GroupRequest.belongsTo(User, { as: "fromUser" })
GroupRequest.belongsTo(Group, { as: "toGroup" })

// When a member of a group wants to invite another user,
// the group member will send that user a group invitation.

GroupInvitation.belongsTo(User, { as: "fromUser" })
GroupInvitation.belongsTo(Group, { as: "forGroup" })
GroupInvitation.belongsTo(User, { as: "toUser" })

Group.belongsToMany(Chat, { through: "GroupChats" })
Chat.belongsTo(Group, { through: "GroupChats" })
Chat.belongsToMany(Message, { through: "ChatMessages" })
Message.belongsTo(Chat, { through: "ChatMessages" })
Message.belongsTo(User)
Message.hasOne(Content)

// Read positions

export const ReadPosition = db.define("ReadPositions", {})

ReadPosition.belongsTo(Chat, { through: "ChatReadPositions" })
Chat.belongsToMany(ReadPosition, { through: "ChatReadPositions" })
ReadPosition.belongsTo(Message)
Message.belongsToMany(ReadPosition, {
  through: "ChatReadPositions",
  as: "readPositions",
})
ReadPosition.belongsTo(User)

// db.sync({ force: true })

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
