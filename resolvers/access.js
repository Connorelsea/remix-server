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
  (root, args, context, error) => {
    console.log("ROOT", root)
    console.log("ARGS", args)
    console.log("CONTEXT", context)
    console.log("ERROR/INFO", error)
    console.log("[AUTH] Checking if authenticated")

    if (context.user === undefined) {
      console.log("[AUTH] User not on context, throwing")
      throw new AuthenticationRequiredError()
    } else {
      console.log("[AUTH] User found, success ")
    }
  }
)
