import { isAuthenticatedResolver } from "./access"
import { baseResolver } from "./base"
import { User } from "../connectors"

import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

import { Op } from "sequelize"

import { createError } from "apollo-errors"

const getHash = password => bcrypt.hashSync(password, 10)
const getToken = payload => jwt.sign(payload, "secretText", { expiresIn: 1440 })

const createUser = baseResolver.createResolver(
  async (
    root,
    { name, username, password, description, email, phone_number },
    context,
    error
  ) => {
    let hash = getHash(password)

    let user = await User.create({
      name,
      username,
      password: hash,
      description,
      email,
      phone_number,
    })

    return {
      id: user.id,
      token: getToken({ userId: user.id }),
    }
  }
)

const UserDoesntExistError = createError("UserDoesntExist", {
  message: "A user with this email address does not exist",
})

const WrongPasswordError = createError("WrongPassword", {
  message: "Your password is incorrect, try again",
})

const loginUserWithEmail = baseResolver.createResolver(
  async (root, { email, password }, context, error) => {
    const user = await User.find({ where: { email: { [Op.like]: email } } })
    if (!user) return new UserDoesntExistError()
    return loginUser(user, password)
  }
)

const loginUserWithPhone = baseResolver.createResolver(
  async (root, { phone_number, password }, context, error) => {
    const user = await User.find({
      where: { phone_number: { [Op.like]: phone_number } },
    })
    if (!user) return new UserDoesntExistError()
    return loginUser(user, password)
  }
)

const loginUser = async (user, password) => {
  const correctPassword = await bcrypt.compare(password, user.password)
  if (!correctPassword) return new WrongPasswordError()
  return {
    id: user.id,
    token: getToken({ userId: user.id }),
  }
}

const friends = baseResolver.createResolver(
  async (root, args, { state: { user } }, error) => {
    return {}
  }
)

export default {
  Mutation: {
    createUser,
    loginUserWithEmail,
    loginUserWithPhone,
  },
  Query: {
    // friends,
  },
}
