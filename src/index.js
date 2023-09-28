'use strict';

module.exports = {
  register(/*{ strapi }*/) {},
  bootstrap({ strapi }) {
    const io = require("./sockets/socket");
    const { getActiveUsers, createActiveUser, findUserInArray, updateActiveUser } = require("./external-services/active-users-service");

    let activeUsers = [];
    io.on("connection", async (socket) => {
      //Consultar el listado de usuarios conectados
      activeUsers = await getActiveUsers();
      //Cuando un usuario se conecta, emite su ID
      socket.on('setUserId', async ({userId, token}) => {
        if(userId !== undefined){
          console.log(`User with socket id: ${socket.id} y id: ${userId}`);
          //Buscar el id del usuario en la coleccion
          const user = await findUserInArray(activeUsers, userId);
          if(user.length === 0){
            //Crear usuario
            await createActiveUser(socket.id, userId, token);
            activeUsers = await getActiveUsers();
          }else{
            //Identificar si el id del socket a actualizar es distinto al socket registrado en la bd
            if(user[0].socket_id !== socket.id){
              //Actualizar usuario
              await updateActiveUser(socket.id, userId, token);
              activeUsers = await getActiveUsers();
            }
            //Actualizar usuario
            // await updateActiveUser(socket.id, userId, token);
          }
        }
      });
      socket.on('disconnect', () => console.log("Cliente desconectado"));
    });

    strapi.io = io;

    module.exports = {
      sockets: io.sockets.sockets,
    }

  },
};
