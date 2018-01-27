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
    const { type, data, chatId } = args

    console.log(args)

    const message = await Message.create(
      {
        content: {
          // type: "remix/text",
          // data: { text: "hello" },
          type,
          data,
        },
      },
      {
        include: [Content],
      }
    )

    console.log(args)

    // TODO, check if user is in the chat, if not, dont send

    const chat = await Chat.findOne({ where: { id: chatId } })
    console.log(chat)
    const group = await chat.getGroup()
    console.log(group)
    const chatMembers = await group.getMembers()
    chat.addMessage(message)
    message.setChat(chat)

    ps.publish("newMessage", {
      newMessage: message,
      forUsers: chatMembers,
    })

    return message
  }
)

const updateReadPosition = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { user: { id } } = context

    const { forMessageId } = args

    const msg = await Message.findOne({ where: { id: forMessageId } })
    const chat = await msg.getChat()

    // If a read position already exists for this specific user
    // in this specific chat, remove it so it can be replaced.

    const existingReadPosition = await ReadPosition.findOne({
      where: { userId: id, chatId: chat.id },
    })

    if (existingReadPosition) {
      existingReadPosition.delete()
    }

    const pos = await ReadPosition.create({
      userId: id,
    })
    pos.setChat(chat)
    pos.setMessage(msg)

    return pos
  }
)

export default {
  Mutation: {
    createMessage,
    updateReadPosition,
  },
  Subscription: {
    newMessage: {
      subscribe: withFilter(
        () => ps.asyncIterator("newMessage"),
        (payload, variables, context) => {
          const { forUserId } = variables
          const { newMessage, forUsers } = payload
          const { user } = context

          console.log("in subscribe filter")

          const foundUser = forUsers.find(user => user.id == forUserId)

          if (foundUser) {
            return true
          } else {
            return false
            // TODO error on
          }
        }
        // TODO add real filtering here
      ),
      // subscribe: () => ps.asyncIterator("newFriendRequest"),
    },
  },
}
