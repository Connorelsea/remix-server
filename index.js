import express from "express";
import { Server as HttpServer } from "http";
import { registerServer, graphiqlExpress } from "apollo-server-express";
import bodyParser from "body-parser";
import cors from "cors";
import compression from "compression";
import { checkToken } from "./utils/token";
import { formatError, createError } from "apollo-errors";
import { createServer } from "http";
import { SubscriptionServer } from "subscriptions-transport-ws";
import { execute, subscribe, GraphQLError } from "graphql";

import { typeDefs } from "./schema";
import { ApolloServer, gql } from "apollo-server";
import { ApolloEngine } from "apollo-engine";
import resolvers from "./resolvers";

require("dotenv").config();

/**
 * Related Documentation
 *
 * Building a 2.0 Apollo Server (apollographql.com/docs/apollo-server/v2/essentials/server.html)
 */
export function startServer() {
  const PORT = process.env.PORT || 8080;

  const app = express();

  applyMiddleware(app);

  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    context: props => {
      console.log("GETTING CONTEXT FROM ", props.req);
      console.log("PROPS", props);
      if (props.req === undefined) {
        if (props.connection !== undefined) {
          console.log(
            "RETURNING SUBSCRIPTION SPECIFIC CONTEXT",
            props.connection.context
          );
          return props.connection.context;
        }
        return { user: undefined };
      }

      return { user: props.req.user };
    },
    tracing: true,
    cacheControl: true,
    // formatError,
    logFunction: info => {
      console.log(info);
    },
  });

  registerServer({ server: apolloServer, app });

  apolloServer
    .listen({
      subscriptions: {
        path: "/subscriptions",
        onConnect: onSubServerConnect,
        onDisconnect: onSubServerDisconnect,
        onOperation: onSubServerOperation,
      },
      http: {
        port: PORT,
      },
      // engineLauncherOptions: {},
      engineProxy: true,
    })
    .then(props => console.log("PROPZ", JSON.stringify(props, null, 2)));
}

function applyMiddleware(app) {
  // Middleware for Apollo Engine tracing has to be first
  // Use GZIP on requests
  app.use(compression());
  app.use(cors({ origin: "*" }));

  app.use(bodyParser.json());

  // Enable user context-

  app.use(function(req, res, next) {
    const token = req.get("authorization");

    console.log("IN USEZ", token);

    if (token == "null" || !token) return next();

    try {
      const payload = checkToken(token);

      req.user = {
        id: payload.userId,
        exp: payload.exp,
        iat: payload.iat,
      };
    } catch (err) {
      console.error(err);
      console.log("CANT GET USER");
    }

    next();
  });
}

/**
 * onSubServerConnect
 *
 *
 * Related Documentation:
 * apollographql.com/docs/graphql-subscriptions/authentication.html
 *
 * @param connectionParams Props from client connecting to the socket server
 * @param webSocket The web socket object
 */
async function onSubServerConnect(connectionParams, webSocket, context) {
  console.log("ON SUB CONNECT");
  console.log(webSocket, context);
  console.log(connectionParams);

  try {
    const payload = checkToken(connectionParams.token);

    console.log("USER PAYLOAD", payload);

    const ret = {
      user: {
        id: payload.userId,
        exp: payload.exp,
        iat: payload.iat,
      },
    };

    console.log("CONTEXT SHOULD BE", ret);
    return ret;
  } catch (err) {
    console.error(err);
    console.log("CANT GET USER");
  }
}

function onSubServerDisconnect(props) {
  console.log("DISCONNECT", props);
}

function onSubServerOperation(message, params, webSocket) {
  console.log("ON SUB OPERATION");
  console.log(message, params, webSocket);
}
