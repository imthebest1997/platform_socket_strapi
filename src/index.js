'use strict';

const { isEmpty } = require("lodash");
let { Server } = require("socket.io");

module.exports = {
  async bootstrap({ strapi }) {
    const io = new Server(strapi.server.httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT"],
        allowedHeaders: ["my-custom-header"],
        credentials: true,
      },
    });
    io.on("connection", async (socket) => {
      socket.on('setUserId', async ({ userId }) => {
        if (userId !== undefined) {
          strapi.log.info(`User with socket id: ${socket.id} y id: ${userId}`);
          await strapi.service('api::active-user.active-user').createOrUpdateActiveUser({ socket_id: socket.id, user_id: userId });
        }
      });
      socket.on('disconnect', async () => {
        await strapi.service('api::active-user.active-user').disconnectUser({ socket_id: socket.id })
        socket.disconnect();
        socket.removeAllListeners();
      });
      socket.on('forceDisconnect', async ( user_id ) => {
        //foce disconnect users
        await strapi.service('api::active-user.active-user').forceDisconnectUser({ user_id: user_id })
        socket.disconnect();
        socket.removeAllListeners();
      });
    });

    strapi.emitToAllUsers = async ({ students, message, nameEvent }) => {
      for (let idStudent of students) {
        const connect = await strapi.service('api::active-user.active-user').getStatusbyId({ user_id: idStudent });
        if (connect.active) {
          io.sockets.sockets.forEach((socket) => {
            if (socket.id === connect.socket_id) {
              socket.emit(nameEvent, message);
              socket.emit("new_notifications", "New notifications");
            }
          });
        }
      }
    };

    strapi.io = io;
  },
};

