import express from "express"
import { graphqlExpress, graphiqlExpress } from "apollo-server-express"
import { Engine } from "apollo-engine"
import bodyParser from "body-parser"
import cors from "cors"
import compression from "compression"
import schema from "./schema"
import { checkToken } from "./utils/token"
import { formatError as apolloFormatError, createError } from "apollo-errors"
import { createServer } from "http"
import { SubscriptionServer } from "subscriptions-transport-ws"
import { execute, subscribe } from "graphql"

require("dotenv").config()

const PORT = process.env.PORT || 8080

// Initialize Apollo Engine

const engine = new Engine({
  graphqlPort: PORT,
  engineConfig: {
    apiKey: process.env.APOLLO_ENGINE,
  },
})

engine.start()

// Initialize Express Server

const app = express()

// Middleware for Apollo Engine tracing has to be first
app.use(engine.expressMiddleware())
// Use GZIP on requests
app.use(compression())

// Use cors
app.use(cors({ origin: "*" }))

// Enable user context

app.use(function(req, res, next) {
  const token = req.get("authorization")

  console.log("REQUEST", req)

  console.log("TOKEN GOT", token)

  if (token === null) return next()

  try {
    const payload = checkToken(token)

    console.log("TOKEN GOT", payload)
    req.user = {
      id: payload.userId,
      exp: payload.exp,
      iat: payload.iat,
    }
  } catch (err) {
    console.error(err)
    console.log("CANT GET USER")
  }

  next()
})

// Error formatting

const UnknownError = createError("UnknownError", {
  message: "An unknown error has occurred.  Please try again later",
})

// Start graphql

const formatError = error => {
  let e = apolloFormatError(error)

  if (e instanceof GraphQLError) {
    e = apolloFormatError(
      new UnknownError({
        data: {
          originalMessage: e.message,
          originalError: e.name,
        },
      })
    )
  }

  return { ...e }
}

app.use(
  "/graphql",
  bodyParser.json(),
  graphqlExpress(request => ({
    schema,
    debug: true,
    tracing: true,
    cacheControl: true,
    context: { user: request.user },
    formatError,
  }))
)

app.get("/graphiql", graphiqlExpress({ endpointURL: "/graphql" }))

// app.listen(PORT)

const ws = createServer(app)

ws.listen(PORT, () => {
  console.log(`GraphQL Server is now running on http://localhost:${PORT}`)
  // Set up the WebSocket for handling GraphQL subscriptions
  new SubscriptionServer(
    {
      execute,
      subscribe,
      schema,
      onConnect: (connectionParams, webSocket) => {
        let req = {}

        console.log(webSocket)

        console.log("ON CONNECT")
        console.log(connectionParams)

        return checkToken(connectionParams.token, function(payload) {
          return {
            user: {
              id: payload.userId,
              exp: payload.exp,
              iat: payload.iat,
            },
          }
        })
      },
    },
    {
      server: ws,
      path: "/subscriptions",
    }
  )
})
