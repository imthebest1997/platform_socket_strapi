// socket.js
let {Server} = require("socket.io");

const io = new Server(strapi.server.httpServer,{
  cors:{
    origin: "http://127.0.0.1:5173",
    methods: ["GET", "POST", "PUT"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});

module.exports = io;
