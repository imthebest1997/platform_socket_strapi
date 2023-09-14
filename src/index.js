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
    let axios = require("axios");

    let io = new Server(strapi.server.httpServer,{
      cors:{
        origin: "http://127.0.0.1:5173",
        methods: ["GET", "POST", "PUT"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
      }
    });

    let users = {};

    function enviarNotificacionACurso(cursoId, mensaje) {
      io.to(`curso_${cursoId}`).emit('notificacion', mensaje);
    }

    io.on("connection", (socket) => {
      // console.log("A user connected: ", socket.id);
      // console.log("Estamos emitiendo");

      socket.on('setUserId', function (userId) {
        if (!users[userId] && userId != null) { // Verifica si la clave ya existe en el objeto
          users[userId] = socket;
        }
      });

      socket.on("create_task", async ({token, lessons, students, course, ...taskCreated})=>{
        let strapiData = {
          data: {
            ...taskCreated,
            lessons
          },
        };

        // console.log(token);
        // console.log(strapiData);
        // console.log(lessons);
        console.log(students);
        await axios
          .post("http://localhost:1337/api/tasks", strapiData,{
            headers: {
              Authorization: `Bearer ${token}`,
            }
          })
          .then((e) => {
            for(let idStudent of students){
              if (users[idStudent]) {
                users[idStudent].emit('task', {
                    ...taskCreated,
                    message: "Tarea creada satisfactoriamente"
                });
              }else {
                console.log(`El usuario con ID ${idStudent} no está registrado.`);
                // Aquí puedes manejar la situación en la que el usuario no está registrado.
              }
            }
            // socket.broadcast.to(lessons).emit("task", {
            //   ...taskCreated,
            //   message: "Tarea creada satisfactoriamente"
            // });
          })
          .catch((e) => console.log("error: ", e.message));
      });

      socket.on("disconnected", ()=>{
        console.log("A user disconnected: ", socket.id);
      });

    });

    strapi.io = io;
  },
};
