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
import { resolver } from "graphql-sequelize";

import { genAccessToken, genRefreshToken } from "../utils/token";

const UserDoesntExistError = createError("UserDoesntExist", {
  message: "A user with this email address does not exist"
});

const DeviceDoesntExistError = createError("DeviceDoesntExist", {
  message: "A device with this ID does not exist"
});

const DeviceDoesntBelongToUserError = createError(
  "DeviceDoesntBelongToUserError",
  {
    message: "The given device does not belong to the given user email"
  }
);

const WrongDeviceError = createError("WrongDevice", {
  message: "This device is not associated with this user"
});

const WrongPasswordError = createError("WrongPassword", {
  message: "Your password is incorrect, try again"
});

const loginWithExistingDevice = baseResolver.createResolver(
  async (root, args, context, error) => {
    const { email, password, deviceId } = args;

    // Check if a user exists with the given email address

    const user = await User.find({
      where: { email: { [Op.like]: email.toLowerCase() } }
    });

    if (!user) throw new UserDoesntExistError();

    // Check if the device the user is attempting to login
    // with exists

    let device;

    if (deviceId || deviceId.trim() !== "") {
      // Attempt to find device with given ID

      device = await Device.find({
        where: {
          id: deviceId
        }
      });

      // Attempt to find the device's user

      let deviceUser = await device.getUser();

      // If the device's user does not match the ID of the
      // user current attempting to login

      if (user.id !== deviceUser.id) {
        throw new WrongDeviceError();
      }
    } else {
      throw new DeviceDoesntExistError();
    }

    // If the user exists, check if their password is correct and matches
    // the stored hashed password

    const correctPassword = await bcrypt.compare(password, user.password);
    if (!correctPassword) throw new WrongPasswordError();

    // Retun the user id and device info (tokens)

    return device;
  }
);

const loginWithNewDevice = baseResolver.createResolver(
  async (root, args, context, error) => {
    const {
      email,
      password,
      deviceName = "Unamed Device",
      operatingSystem,
      browser,
      cpu,
      gpu
    } = args;

    // Check if a user exists with the given email address

    const user = await User.find({
      where: { email: { [Op.like]: email.toLowerCase() } }
    });

    if (!user) throw new UserDoesntExistError();

    // If the user exists, check if their password is correct and matches
    // the stored hashed password

    const correctPassword = await bcrypt.compare(password, user.password);
    if (!correctPassword) throw new WrongPasswordError();

    // Create new device with given meta

    console.log("create new device");

    let newDevice = await Device.create({
      accessToken: genAccessToken({ userId: user.id }),
      refreshToken: genRefreshToken({ userId: user.id }),
      name: deviceName,
      operatingSystem,
      browser,
      cpu,
      gpu,
      trackActivityLocation: false,
      retainActivityHistoryForTime: "40h"
    });

    console.log(newDevice);

    console.log("USER");
    console.log(user);

    try {
      console.log("set user on device)");
      newDevice = await newDevice.setUser(user);
      console.log("add device to user");
      user.addDevice(newDevice);
    } catch (err) {
      console.error(err);
    }

    let betterDevice = await Device.find({
      where: { id: newDevice.id },
      include: [User]
    });

    console.log("Better device");
    console.log(betterDevice);

    return betterDevice;
  }
);

const createNewDevice = isAuthenticatedResolver.createResolver(
  async (root, args, context, error) => {
    const { name = "New Device", password } = args;

    // Find user who's ID is on the context. This is the user
    // that the newly created device wil be associated with.

    const user = await User.findOne({ where: { id: context.user.id } });

    const correctPassword = await bcrypt.compare(password, user.password);
    if (!correctPassword) throw new WrongPasswordError();

    let device;

    device = await Device.create({
      name,
      valid: true,
      accessToken: genAccessToken({ userId: user.id }),
      refreshToken: genRefreshToken({ userId: user.id })
    });

    // Set correct relations for device join

    device.setUser(user);
    user.addDevice(device);

    return device;
  }
);

const getNewAccessToken = baseResolver.createResolver(
  async (root, args, context, info) => {
    const { refreshToken } = args;

    let device;

    try {
      device = await Device.find({
        where: { refreshToken },
        include: [User]
      });
    } catch (err) {
      console.error(err);
    }

    if (device) {
      try {
        // This verifies the signature and decodes the JWT.
        // If the signature is not correct an error is thrown.

        const decoded = jwt.verify(refreshToken, "secretText");
        const newAccessToken = genAccessToken({ userId: device.user.id });

        console.log(decoded);

        device = await device.update({
          accessToken: newAccessToken
        });

        console.log("xrb78");
        console.log(device);

        return device;
      } catch (err) {
        console.log("dec0de error");
        console.error(err);
      }

      console.log(decoded);
      console.log("decoded");

      // generate refresh token
      // mutate database device to have new refresh token
      // return mutated device to user,
      // which will replace their local copy
    } else {
      console.log("dwtrtnf");
      // ERROR: Device with this refresh token not found.
    }

    // check if refreshToken is valid
    // Use server-side secret and check expiry

    // If refreshToken is valid, generate a new refresh token
    // and send it back to the server
  }
);

const getNewRefreshToken = baseResolver.createResolver(
  async (root, args, context, info) => {
    const { refreshToken, email, password } = args;

    // 1. Find device from refreshToken, which also ensures
    //    this refresh token was issued from this server.

    let device = await Device.find({
      where: { refreshToken },
      include: [User]
    });

    if (!device) throw new DeviceDoesntExistError();

    // 2. Find user from email

    const user = await User.find({
      where: { email: { [Op.like]: email.toLowerCase() } }
    });

    if (!user) throw new UserDoesntExistError();

    // 3. Ensure given device belongs to found user

    const userDevices = await user.getDevices();
    const foundDevice = userDevices.find(d => d.id === device.id);

    if (!foundDevice) throw new DeviceDoesntBelongToUserError();

    // 4. Ensure password is correct

    const correctPassword = await bcrypt.compare(
      password,
      device.user.password
    );

    if (!correctPassword) throw new WrongPasswordError();

    // const decoded = jwt.verify(refreshToken, "secretText");

    // 5. Update device with new refresh token and return it

    const newRefreshToken = genRefreshToken({ userId: device.user.id });

    device = await device.update({
      refreshToken: newRefreshToken
    });

    return device;
  }
);

const getDeviceUser = baseResolver.createResolver(
  async (root, args, context, info) => {
    const device = root;
    return await device.getUser();
  }
);

export default {
  Mutation: {
    loginWithExistingDevice,
    loginWithNewDevice,
    createNewDevice,
    getNewAccessToken,
    getNewRefreshToken
  },
  Device: {
    user: getDeviceUser
  }
};
