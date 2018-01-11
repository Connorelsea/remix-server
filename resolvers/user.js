import { isAuthenticatedResolver } from "./access"
import { baseResolver } from "./base"
import { User } from "../connectors"

import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const createUser = baseResolver.createResolver(
  async (
    root,
    { name, username, password, description, email, phone_number },
    context,
    error
  ) => {
    let hash = bcrypt.hashSync(password, 10)

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

    let token = jwt.sign(payload, "secretText", {
      expiresIn: 1440, // 24 hours
    })

    return {
      id: user.id,
      token,
    }
  }
)

const loginUser = baseResolver.createResolver(
  async (root, args, contex, error) => {
    return user.id
  }
)

export default {
  Mutation: {
    createUser,
    // loginUser,
  },
}
