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

    io.on("connection", (socket) => {
      console.log("A user connected: ", socket.id);
      console.log("Estamos emitiendo");

      socket.emit("hello", { message: "Welcome to my website" });

      socket.on("create_task", async ({token, ...taskCreated})=>{
        // console.log(taskCreated);
        // console.log(token);
        let strapiData = {
          data: {
            ...taskCreated
          },
        };

        console.log(strapiData);

        await axios
          .post("http://localhost:1337/api/tasks", strapiData,{
            headers: {
              Authorization: `Bearer ${token}`,
            }
          })
          .then((e) => {
            io.emit("task", {
              ...taskCreated,
              message: "Tarea creada satisfactoriamente"
            });
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
