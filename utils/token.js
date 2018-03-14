import jwt from "jsonwebtoken"

// Access Token
// Used when the user wants to acces material on the server
// or make mutations (chat, send media, etc.) against the server.
// This token expires frequently.

// Refresh Token
// This token expires less frequently and is only given to a trusted
// device. A refresh token is associated with a specific device and
// can be revoked manually by the user.

// Getting a new Access Token?
// When said device's current access token expires, it can request
// a new access token from the server by using a valid refresh token
// that has not been revoked and has not expired.

// Note: This means that any device you save a "refresh token" on
// will have the ability to access your account for an extended
// period of time. A device with only an access token, no refresh token,
// will only be able to access your content for two hours. You can also
// easily shorten this time by logging out which deletes the current
// access token. This makes just having a refresh token safer for a
// public device.

export const genAccessToken = payload =>
  jwt.sign(payload, "secretText", { expiresIn: "6m" })

export const genRefreshToken = payload =>
  jwt.sign(payload, "secretText", { expiresIn: "75h" })

export const checkToken = (token, callback) =>
  jwt.verify(token, "secretText", {}, callback)
