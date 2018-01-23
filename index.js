import koa from "koa" // koa@2
import koaRouter from "koa-router" // koa-router@next
import koaBody from "koa-bodyparser" // koa-bodyparser@next
import { graphqlKoa, graphiqlKoa } from "apollo-server-koa"

import schema from "./schema"

import { checkToken } from "./utils/token"
import { execute, subscribe } from "graphql"
import { createServer } from "http"
import { SubscriptionServer } from "subscriptions-transport-ws"

const app = new koa()
const router = new koaRouter()
const PORT = process.env.PORT || 8080

import respond from "koa-respond"

import cors from "kcors"

function userIdentifier() {
  return async (ctx, next) => {
    const token = ctx.request.headers.authorization

    try {
      const payload = checkToken(token)
      ctx.user = {
        id: payload.userId,
        exp: payload.exp,
        iat: payload.iat,
      }
    } catch (error) {
      // ctx.user = undefined
      // ctx.throw(401, { error: "access_denied " })
      // ctx.unauthorized()
      // throw new Error("access_denied")
    }

    await next()
  }
}

const gqlkoa = graphqlKoa(ctx => ({
  schema,
  context: { ...ctx },
}))

var logger = require("koa-logger")

// koaBody is needed just for POST.
router.post("/graphql", koaBody(), gqlkoa)
router.get("/graphql", gqlkoa)

router.get("/graphiql", graphiqlKoa({ endpointURL: "/graphql" }))

app.use(
  cors({
    origin: "*",
  })
)
app.use(logger())
app.use(respond())
app.use(userIdentifier())
app.use(router.routes())
app.use(router.allowedMethods())
// app.listen(PORT)

// Wrap the Express server
const ws = createServer(app.callback())

ws.listen(PORT, () => {
  console.log(`GraphQL Server is now running on http://localhost:${PORT}`)
  // Set up the WebSocket for handling GraphQL subscriptions
  new SubscriptionServer(
    {
      execute,
      subscribe,
      schema,
    },
    {
      server: ws,
      path: "/subscriptions",
    }
  )
})
