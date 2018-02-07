import jwt from "jsonwebtoken"

export const genToken = payload =>
  jwt.sign(payload, "secretText", { expiresIn: 1440 })

export const checkToken = (token, callback) =>
  jwt.verify(token, "secretText", {}, callback)
