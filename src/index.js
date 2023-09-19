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
    let {Server} = require("socket.io");
    const { getActiveUsers, createActiveUser, findUserInArray, updateActiveUser } = require("./external-services/active-users-service");

    let axios = require("axios");

    let io = new Server(strapi.server.httpServer,{
      cors:{
        origin: "http://127.0.0.1:5173",
        methods: ["GET", "POST", "PUT"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
      }
    });

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


      socket.on("create_task", async ({token, lessons, students, course, ...taskCreated})=>{
        let strapiData = {
          data: {
            ...taskCreated,
            lessons
          },
        };

        // console.log(students);
        await axios
          .post("http://localhost:1337/api/tasks", strapiData,{
            headers: {
              Authorization: `Bearer ${token}`,
            }
          })
          .then((e) => {
            for(let idStudent of students){
              const userConnected = activeUsers.find((user) => user.user_id === idStudent.toString());

              //Si el usuario conectado se le emite la notificacion en tiempo real.
              if(userConnected){
                users[idStudent].emit("task_created", {
                  ...taskCreated,
                  message: "Tarea creada satisfactoriamente"
                });
              }
            }
          })
          .catch((e) => console.log("error: ", e.message));
      });

      socket.on('disconnect', () => console.log("Cliente desconectado"));

    });

    strapi.io = io;
  },
};
