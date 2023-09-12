// module.exports = (cb) => {
//   const io = require("socket.io")(strapi.server, {
//     cors: {
//       origin: "*",
//       methods: ["GET", "POST"],
//     },
//   });
//   io.on("connection", function (socket) {
//     // send message on user connection
//     socket.emit("hello", JSON.stringify({ message: "Welcome to my website" }));
//     console.log("Estamos emitiendo");
//   });

//   strapi.io = io;
//   strapi.emitToAllUsers = food => io.emit('player_data', food);
//   cb();
// };
