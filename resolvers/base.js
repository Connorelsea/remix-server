import { createResolver } from "apollo-resolvers";
import { createError, isInstance } from "apollo-errors";
import { EROFS } from "constants";

const UnknownError = createError("UnknownError", {
  message: "An unknown error has occurred!  Please try again later"
});

export const baseResolver = createResolver(
  //incoming requests will pass through this resolver like a no-op
  null,

  /*
    Only mask outgoing errors that aren't already apollo-errors,
    such as ORM errors etc
  */
  (root, args, context, error) => {
    console.log("INTERNAL ERROR");
    console.error(error);

    console.log("EXTERNAL ERROR");
    throw isInstance(error) ? error : new UnknownError();

    console.log("ROOT", root);
    console.log("ARGS", args);
    console.log("CONTEXT", context);
  }
);
