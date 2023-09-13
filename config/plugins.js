module.exports = ({ env }) => ({
  // ...
  "io": {
    "enabled": true,
    "config": {
      "IOServerOptions" :{
        "cors": { "origin": "http://127.0.0.1:5173/", "methods": ["GET", "POST", "PUT"] },
      },
      "contentTypes": {
        "message": "*",
        "chat":["create"]
      },
      "events":[
        {
          "name": "connection",
          "handler": ({ strapi }, socket) => {
            strapi.log.info(`[io] new connection with id ${socket.id}`);
          },
        },
      ]
    },
  },
  // ...
});
