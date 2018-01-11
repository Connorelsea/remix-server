import { createResolver } from "apollo-resolvers"
import { createError, isInstance } from "apollo-errors"

const UnknownError = createError("UnknownError", {
  message: "An unknown error has occurred!  Please try again later",
})

export const baseResolver = createResolver(
  //incoming requests will pass through this resolver like a no-op
  null,

  /*
    Only mask outgoing errors that aren't already apollo-errors,
    such as ORM errors etc
  */
  (root, args, context, error) =>
    isInstance(error) ? error : new UnknownError()
)
