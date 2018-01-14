import koa from "koa" // koa@2
import koaRouter from "koa-router" // koa-router@next
import koaBody from "koa-bodyparser" // koa-bodyparser@next
import { graphqlKoa, graphiqlKoa } from "apollo-server-koa"

import schema from "./schema"

import { checkToken } from "./utils/token"

const app = new koa()
const router = new koaRouter()
const PORT = 3000

function userIdentifier() {
  return async (ctx, next) => {
    const token = ctx.request.headers.authorization

    try {
      const payload = checkToken(token)
      ctx.state.user = payload
    } catch (error) {
      ctx.state.user = undefined
      console.error("Token not valid")
    }

    console.log("Going to next", next)

    await next()
  }
}

app.use(userIdentifier())

// koaBody is needed just for POST.
router.post("/graphql", koaBody(), graphqlKoa({ schema }))
router.get("/graphql", graphqlKoa({ schema }))

router.get("/graphiql", graphiqlKoa({ endpointURL: "/graphql" }))

app.use(router.routes())
app.use(router.allowedMethods())
app.listen(PORT)
