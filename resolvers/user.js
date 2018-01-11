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

    const payload = {
      userId: user.id,
    }

    let token = getToken(payload)

    return {
      id: user.id,
      token,
    }
  }
)

const WrongPasswordError = createError("WrongPassword", {
  message: "Your password is incorrect, try again",
})

const loginUser = baseResolver.createResolver(
  async (root, { email, password }, contex, error) => {
    const user = await User.find({ where: { email: { [Op.like]: email } } })
    const correctPassword = await bcrypt.compare(password, user.password)

    if (!correctPassword) {
      return new WrongPasswordError()
    }

    if (user !== undefined) {
      const payload = {
        userId: user.id,
      }

      let token = getToken(payload)

      return {
        id: user.id,
        token,
      }
    } else {
      // ERROR
    }
  }
)

export default {
  Mutation: {
    createUser,
    loginUser,
  },
}
