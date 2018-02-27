import { isAuthenticatedResolver } from "./access"
import { baseResolver } from "./base"
import {
  User,
  Group,
  Chat,
  Message,
  Content,
  ReadPosition,
} from "../connectors"
import { Op } from "sequelize"
import { PubSub, withFilter } from "graphql-subscriptions"

const ps = new PubSub()

const createMessage = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { user: { id } } = context
    const { type, data, chatId } = args

    console.log(args)

    let messages = []

    let msg = await Message.create(
      {
        content: {
          // type: "remix/text",
          // data: { text: "hello" },
          type,
          data,
        },
        userId: id,
      },
      {
        include: [
          { model: Content, as: "content" },
          { model: ReadPosition, as: "readPositions" },
        ],
      }
    )
    messages.push(msg)

    if (type === "remix/text") {
      if (data.text.includes("https://open.spotify.com/track/")) {
        // SPOTIFY TRACK LINK
        const spotifyId = data.text.split("/track/")[1]
        messages = []
        msg = await Message.create(
          {
            content: {
              type: "remix/spotify/track",
              data: { id: spotifyId },
            },
            userId: id,
          },
          {
            include: [
              { model: Content, as: "content" },
              { model: ReadPosition, as: "readPositions" },
            ],
          }
        )
        messages.push(msg)
      } else if (data.text.includes("https://open.spotify.com/album/")) {
        // SPOTIFY ALBUM LINK
        // https://open.spotify.com/album/1BzMONuUlgUnqOrg2aQeAY?si=yaqT1PszSuaHapjm2K61iQ

        const spotifyId = data.text.split("/album/")[1]
        console.log("SPOTIFY ID", spotifyId)
        messages = []
        msg = await Message.create(
          {
            content: {
              type: "remix/spotify/album",
              data: { id: spotifyId },
            },
            userId: id,
          },
          {
            include: [
              { model: Content, as: "content" },
              { model: ReadPosition, as: "readPositions" },
            ],
          }
        )
        messages.push(msg)
      }
    }

    // TODO, check if user is in the chat, if not, dont send

    const chat = await Chat.findOne({ where: { id: chatId } })
    const group = await chat.getGroup()
    const chatMembers = await group.getMembers()

    messages.forEach(message => {
      message.setChat(chat)
      chat.addMessage(message)
      ps.publish("newMessage", {
        newMessage: message,
        forUsers: chatMembers,
      })
    })

    // TODO: Return multiple here??
    return messages[0]
  }
)

const updateReadPosition = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { user: { id } } = context

    const { forMessageId } = args

    const msg = await Message.findOne({ where: { id: forMessageId } })
    const chat = await msg.getChat()
    const group = await chat.getGroup()
    const members = await group.getMembers()

    // If a read position already exists for this specific user
    // in this specific chat, remove it so it can be replaced.

    const existingReadPosition = await ReadPosition.findOne({
      where: { userId: id, chatId: chat.id },
    })

    if (existingReadPosition) {
      existingReadPosition.destroy()
    }

    const pos = await ReadPosition.create({
      userId: id,
      atChatTime: msg.createdAt,
    })
    pos.setChat(chat)
    pos.setMessage(msg)

    ps.publish("newReadPosition", {
      newReadPosition: pos,
      forUsers: members.filter(member => member.id !== id),
    })

    return pos
  }
)

const getReadPositions = isAuthenticatedResolver.createResolver(
  async (message, args, context, info) => {
    return await ReadPosition.findAll({ where: { userId: message.userId } })
  }
)

const getContent = isAuthenticatedResolver.createResolver(
  async (message, args, context, info) => {
    return await message.getContent()
  }
)

export default {
  Message: {
    readPositions: getReadPositions,
    content: getContent,
  },
  Mutation: {
    createMessage,
    updateReadPosition,
  },
  Subscription: {
    newReadPosition: {
      subscribe: withFilter(
        () => ps.asyncIterator("newReadPosition"),
        (payload, variables, context) => {
          const { forUserId } = variables
          const { newReadPosition, forUsers } = payload
          const { user } = context

          const foundUser = forUsers.find(user => user.id == forUserId)

          if (foundUser) {
            return true
          } else {
            return false
          }
        }
      ),
    },

    newMessage: {
      subscribe: withFilter(
        () => ps.asyncIterator("newMessage"),
        (payload, variables, context) => {
          const { forUserId } = variables
          const { newMessage, forUsers } = payload
          const { user } = context

          const foundUser = forUsers.find(user => user.id == forUserId)

          if (foundUser) {
            return true
          } else {
            return false
          }
        }
      ),
    },
  },
}
