// socket.js
let {Server} = require("socket.io");

const io = new Server(strapi.server.httpServer,{
  cors:{
    origin: "*",
    methods: ["GET", "POST", "PUT"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});

module.exports = io;
