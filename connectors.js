import Sequelize from "sequelize"

const db = new Sequelize("remix", "", null, {
  dialect: "postgres",
})

export const User = db.define("user", {
  name: Sequelize.STRING,
  username: Sequelize.STRING,
  password: Sequelize.STRING,
  description: Sequelize.TEXT,
  email: Sequelize.STRING,
  phone_number: Sequelize.STRING,
})

export const Login = db.define("login", {
  device: Sequelize.STRING,
})

User.hasMany(Login)

const Group = db.define("group", {
  name: Sequelize.STRING,
  description: Sequelize.TEXT,
})

const Chat = db.define("chat", {
  name: Sequelize.STRING,
  description: Sequelize.TEXT,
})

const Message = db.define("message", {
  why: Sequelize.STRING,
})

const ContentTypes = [
  "remix/text",
  "remix/sticker",
  "remix/image",
  "remix/file",
  "remix/poll",
  "remix/contact",
  "remix/spotify_song",
  "remix/spotify_album",
  "remix/spotify_playlist",
]

const Content = db.define("content", {
  type: Sequelize.ENUM(...ContentTypes),
  data: Sequelize.JSON,
})

const FriendRequest = db.define("friend_request", {
  message: Sequelize.TEXT,
})

const GroupRequest = db.define("group_request", {
  message: Sequelize.TEXT,
})

const GroupInvitation = db.define("group_invitation", {
  message: Sequelize.TEXT,
})

// Associations

User.belongsToMany(Group, { through: "UserGroupMembership" })

// // A group is a collection of users and can be formed
// // for any purpose. Examples include (but of course aren't
// // limited to), topic-based groups, groups for college courses,
// // a group of friends, any team-based communication.

// Group.hasMany(User, { as: "members" })
// // Group.hasMany(Chat)
// // User.hasMany(Group)

// // Users can private message other users that have accepted
// // their friend requests.

// User.hasMany(User, { as: "friends" })
// User.hasMany(Group)

// // Multiple groups can participate in a single chat
// Chat.hasMany(Group)

// // Some types not yet supported. Inteded eventual support for all listed

// Content.hasOne(User, { as: "creator" })

// // When a user wants to send a message in a chat, a new message is created
// // with a certain content. That content can be text, an image, etc.

// // When a user X wants to forward a message from user Y to chat Z,
// // a new message with fromUser X is created with toChat Z and content
// // pointing to the content of message Y. The original sender of the
// // forward can be identified by the creator field on the content of
// // message Y.

// // Message

// Message.hasOne(User, { as: "fromUser" })
// Message.hasOne(Chat, { as: "toChat" })
// Message.hasOne(Content)

// // When a user wants to message another user directly,
// // they send a friend request. Once the friend request
// // is accepted, the two users can private message.

// FriendRequest.hasOne(User, { as: "fromUser" })
// FriendRequest.hasOne(User, { as: "toUser" })

// // When a user wants to join a group, they send the group
// // a request to join. Once an admin of the group accepts
// // the request, the user requesting can partake in group
// // chats.

// GroupRequest.hasOne(User, { as: "fromUser" })
// GroupRequest.hasOne(Group, { as: "toGroup" })

// // When a member of a group wants to invite another user,
// // the group member will send that user a group invitation.

// GroupInvitation.hasOne(User, { as: "fromUser" })
// GroupInvitation.hasOne(Group, { as: "forGroup" })

// console.log("Starting SYNC")

db.sync({ force: true }).then(val => console.log("Done syncing"))
