import jwt from "jsonwebtoken"

export const genToken = payload =>
  jwt.sign(payload, "secretText", { expiresIn: 1440 })

export const checkToken = token => jwt.verify(token, "secretText")
