'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }) {
    const io = require("./sockets/socket");
    const { getActiveUsers, createActiveUser, findUserInArray, updateActiveUser } = require("./external-services/active-users-service");
    const {sendNotificationV1} = require("./sockets/socket-notification");
    let activeUsers = [];
    let users = {};
    io.on("connection", async (socket) => {
      //Consultar el listado de usuarios conectados
      activeUsers = await getActiveUsers();
      //Cuando un usuario se conecta, emite su ID
      socket.on('setUserId', async ({userId, token}) => {
        if(userId !== undefined){
          //Buscar el id del usuario en la coleccion
          const user = await findUserInArray(activeUsers, userId);
          if(user.length === 0){
            //Crear usuario
            const {data, status} = await createActiveUser(socket.id, userId, token);
            activeUsers = await getActiveUsers();
            users[userId] = socket;
          }else{
            //Actualizar usuario
            const {data, status}  = await updateActiveUser(socket.id, userId, token);
            activeUsers = await getActiveUsers();
            users[userId] = socket;
            console.log(activeUsers);
          }
        }
      });
      socket.on("create_task", ({students, message})=> sendNotificationV1(students, activeUsers, io.sockets.sockets, message));
      socket.on('disconnect', () => console.log("Cliente desconectado"));
    });
    strapi.io = io;
  },
};
