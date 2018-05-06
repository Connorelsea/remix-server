// @flow

import { isAuthenticatedResolver } from "./access";
import { baseResolver } from "./base";
import {
  FriendRequest,
  GroupRequest,
  GroupInvitation,
  User,
  Group,
  Chat
} from "../connectors";
import { Op } from "sequelize";
import { PubSub, withFilter } from "graphql-subscriptions";
import { currentId } from "async_hooks";
import { createError } from "apollo-errors";

const ps = new PubSub();

const createFriendRequest = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { message, fromUserId, toUserId } = args;
    const friendRequest = await FriendRequest.create(
      {
        message,
        fromUserId,
        toUserId
      },
      {
        include: [
          { model: User, as: "fromUser" },
          { model: User, as: "toUser" }
        ]
      }
    );

    ps.publish("newFriendRequest", {
      newFriendRequest: friendRequest
    });

    return friendRequest;
  }
);

const getToUser = baseResolver.createResolver(
  async (root, args, context, info) => {
    return root.getToUser();
  }
);

const getFromUser = baseResolver.createResolver(
  async (root, args, context, info) => {
    return root.getFromUser();
  }
);

const acceptFriendRequest = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { friendRequestId } = args;
    const {
      user: { id }
    } = context;

    const friendRequest = await FriendRequest.findOne({
      where: { id: friendRequestId }
    });

    if (friendRequest.toUserId === id) {
      const currentUser = await User.findOne({ where: { id } });
      const newFriend = await User.findOne({
        where: { id: friendRequest.fromUserId }
      });
      currentUser.addFriend(newFriend);
      newFriend.addFriend(currentUser);

      const newGroup = await Group.create({
        name: "friend",
        description: `A great friendship`,
        isDirectMessage: true
      });

      newGroup.addMember(currentUser);
      newGroup.addMember(newFriend);

      const newChat = await Chat.create({
        name: "general",
        description: "Conversation and chatting"
      });

      const secondChat = await Chat.create({
        name: "music",
        description: "Share and discuss songs, albums, artists"
      });

      newGroup.addChat(newChat);
      await newChat.setGroup(newGroup);

      newGroup.addChat(secondChat);
      await secondChat.setGroup(newGroup);

      await friendRequest.destroy();

      // Send web socket notification to both new friends
      // The frontend will react to these by adding a new
      // relevant user and new group to the redux store.

      ps.publish("newFriend", {
        newFriend: {
          forUserId: currentUser.id,
          newUser: newFriend,
          newGroup
        }
      });

      ps.publish("newFriend", {
        newFriend: {
          forUserId: newFriend.id,
          newUser: currentUser,
          newGroup
        }
      });

      return "true";
    } else {
      return -999;
      // throw erorr, not right user
    }
  }
);

/**
 * Group Invitations
 */

const IncorrectUserError = createError("IncorrectUser", {
  message: "user and current context user dont match"
});

const UserDoesntExistError = createError("UserDoesntExist", {
  message: "A user with this ID doesn't exist"
});

const GroupDoesntExistError = createError("GroupDoesntExist", {
  message: "A group with this ID doesn't exist"
});

const NotGroupMemberError = createError("NotGroupMember", {
  message: "You are not a member of this group"
});

const NotAdminError = createError("NotAdmin", {
  message: "Only admins of this group can invite new members"
});

const createGroupInvitation = isAuthenticatedResolver.createResolver(
  async (root, args, context, info) => {
    const { message, fromUserId, toUserId, forGroupId } = args;
    const { user } = context;

    const fromUser = await User.find({ where: { id: fromUserId } });
    const toUser = await User.find({ where: { id: toUserId } });
    const forGroup = await Group.find({ where: { id: forGroupId } });

    // TODO: If toUser banned fromUser, don't send, generate error

    // Ensure users and group exist

    console.log("IDZ", fromUser.id, user.id, fromUserId);

    if (!fromUser || !toUser) throw new UserDoesntExistError();
    if (!forGroup) throw new GroupDoesntExistError();
    if (fromUser.id !== user.id) throw new IncorrectUserError();

    // Ensure sender is a member of said group

    const groupMembers = await forGroup.getMembers();
    console.log("MEMBERZ", groupMembers);
    const senderIsMember =
      groupMembers.find(u => u.id === fromUser.id) !== undefined;

    if (!senderIsMember) throw new NotGroupMemberError();

    // Check if group allows members to send invitations

    if (forGroup.allowMemberInvites === false) {
      const groupAdmins = await forGroup.getAdmins();
      const senderIsAdmin =
        groupAdmins.find(u => u.id === fromUserId) !== undefined;

      if (!senderIsAdmin) throw new NotAdminError();
    }

    // Create invitation

    const invitation = await GroupInvitation.create({
      message
    });

    const relations = await Promise.all([
      invitation.setFromUser(fromUser),
      invitation.setToUser(toUser),
      invitation.setForGroup(forGroup)
    ]);

    // TODO: Send subscription event for toUser

    return invitation;
  }
);

const acceptGroupInvitation = isAuthenticatedResolver.createResolver(
  async (root, args, context, info) => {
    const { invitationId } = args;
    const { user } = context;

    const invite = await GroupInvitation.find({
      where: { id: invitationId }
    });

    const toUser = await invite.getToUser();

    if (toUser.id !== user.id) throw new IncorrectUserError();

    const forGroup = await invite.getForGroup();

    await forGroup.addMember(toUser.id);
    await toUser.addGroup(forGroup.id);

    return forGroup;
  }
);

const getForGroup = baseResolver.createResolver(
  async (root, args, context, info) => {
    return root.getForGroup();
  }
);

export default {
  FriendRequest: {
    toUser: getToUser,
    fromUser: getFromUser
  },
  GroupInvitation: {
    toUser: getToUser,
    fromUser: getFromUser,
    forGroup: getForGroup
  },
  Mutation: {
    createFriendRequest,
    acceptFriendRequest,
    createGroupInvitation,
    acceptGroupInvitation
  },
  Query: {},
  Subscription: {
    newFriendRequest: {
      subscribe: withFilter(
        () => ps.asyncIterator("newFriendRequest"),
        (payload, variables) =>
          payload.newFriendRequest.toUserId == variables.toUserId
      )
    },
    newFriend: {
      subscribe: withFilter(
        () => ps.asyncIterator("newFriend"),
        (payload, variables) =>
          payload.newFriend.forUserId == variables.forUserId
      )
    }
  }
};
