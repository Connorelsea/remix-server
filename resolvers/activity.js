import { isAuthenticatedResolver } from "./access";
import { baseResolver } from "./base";
import {
  User,
  FriendRequest,
  MyFriendRequests,
  Message,
  Content,
  ReadPosition,
  Group,
  Chat,
  Device
} from "../connectors";

import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import { Op, col } from "sequelize";

import { createError } from "apollo-errors";
import { repop, solver } from "graphql-sequelize";

import { genAccessToken, genRefreshToken } from "../utils/token";

const newActivity = isAuthenticatedResolver.createResolver(
  async (root, args, context, info) => {
    const { type, downloadLevel, batteryLevel, latitude, longitude } = args;

    // A new activity is a "change in the user's current state"
    // Such as a shifting from offline to online or shifting from
    // one location to another (if they have location tracking enabled)

    // Create new activity in database
    // Send subscription update for new activity
  }
);

export default {
  Mutation: {
    newActivity
  }
};
