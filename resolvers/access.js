import { createError } from "apollo-errors"

import { baseResolver } from "./base"

const ForbiddenError = createError("ForbiddenError", {
  message: "You are not allowed to do this",
})

const AuthenticationRequiredError = createError("AuthenticationRequiredError", {
  message: "You must be logged in to do this",
})

export const isAuthenticatedResolver = baseResolver.createResolver(
  // Extract the user from context (undefined if non-existent)
  (root, args, { state: { user } }, error) => {
    console.log("Checking if authenticated")
    if (!user) throw new AuthenticationRequiredError()
  }
)
