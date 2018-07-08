// @flow

// each user will have an azure container
// an azure container contains blobs as a single directory
// a user can place a file in their remix storage into a sub directory
// but these paths are stored in the remix database and the folder structure
// wil not be reflected in the azure container.

// resolvers
// -- upload any file to any path, that is Remix Storage
// -- select any file at any path (where said file is an image) and set it as the user's profile picture

import { isAuthenticatedResolver } from "./access";
import { baseResolver } from "./base";
import {
  FriendRequest,
  GroupRequest,
  GroupInvitation,
  User,
  Group,
  Chat,
} from "../connectors";
import { Op } from "sequelize";
import { PubSub, withFilter } from "graphql-subscriptions";
import { currentId } from "async_hooks";
import { createError } from "apollo-errors";
import storage from "azure-storage";
import { getHash } from "./user";

const ps = new PubSub();

const connectionString = process.env.AZURE_CONNECTION_STRING;
const blobService = storage.createBlobService(connectionString);

/**
 * Each remix user using storage will have an Azure container represented
 * by their hashed unique user ID. The user ID is hashed to prevent exposing
 * real database IDs in container or blob URLs that may end up being shared.
 */
const createContainer = containerName => {
  return new Promise((resolve, reject) => {
    blobService.createContainerIfNotExists(
      containerName,
      { publicAccessLevel: "private" },
      (err, result, response) => {
        console.log(result, response);
        if (err) reject(err);
        if (resolt) resolve(response);
      }
    );
  });
};

const upload = (containerName, blobName, sourceFilePath) => {
  return new Promise((resolve, reject) => {
    blobService.createBlockBlobFromLocalFile(
      containerName,
      blobName,
      sourceFilePath,
      (err, result) => {
        console.log(result);
        if (err) reject(err);
        else resolve(result);
      }
    );
  });
};

/**
 * Each remix user using storage will have an Azure container represented
 * by their hashed unique user ID. The user ID is hashed to prevent exposing
 * real database IDs in container or blob URLs that may end up being shared.
 *
 * Return a SAS URL created using a signed token.
 */
const createStorage = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const {
      user: { id },
    } = context;

    const containerName = getHash(id);

    const sasUrl = await createContainer(containerName).then(response => {
      const startDate = new Date();
      const expiryDate = new Date(startDate);
      expiryDate.setMinutes(startDate.getMinutes() + 60);
      startDate.setMinutes(startDate.getMinutes() - 10);

      const sharedAccessPolicy = {
        AccessPolicy: {
          Permissions: "rwal", // read write add list (not delete)
          Start: startDate,
          Expiry: expiryDate,
        },
      };

      // No blob name, returned SAS should be for creating files
      // in a specific container
      const blobName = undefined;

      const token = blobService.generateSharedAccessSignature(
        containerName,
        blobName,
        sharedAccessPolicy
      );

      const sasUrl = blobService.getUrl(containerName, blobName, token);

      return sasUrl;
    });

    return sasUrl;
  }
);

const uploadFile = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { upload } = args;
    const { stream, filename, mimetype, encoding } = await upload;

    return { id, filename, mimetype, encoding };
  }
);

export default {
  Mutation: {
    uploadFile,
    createStorage,
  },
  Query: {},
  Subscription: {
    old: {
      subscribe: withFilter(
        () => ps.asyncIterator("newFriendRequest"),
        (payload, variables) =>
          payload.newFriendRequest.toUserId == variables.toUserId
      ),
    },
  },
};
