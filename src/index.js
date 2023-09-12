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

    let io = new Server(strapi.server.httpServer,{
      cors:{
        origin: "http://127.0.0.1:5173",
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true
      }
    });

    let msg = [];

    io.on("connection", (socket) => {
      console.log("A user connected: ", socket.id);
      console.log("Estamos emitiendo");

      // socket.emit("hello", JSON.stringify({ message: "Welcome to my website" }));
      socket.emit("hello", { message: "Welcome to my website" });

      socket.on("disconnected", ()=>{
        console.log("A user disconnected: ", socket.id);
      });

    });

    strapi.io = io;
  },
};
