const sendNotificationV1 = (students, activeUsers, socketsConnected, message, nameEvent) => {
  for(let idStudent of students){
    const userConnected = activeUsers.find((user) => user.user_id === idStudent.toString());
    //Versión v1.
    socketsConnected.forEach((socket) => {
      if (socket.id === userConnected?.socket_id && userConnected) {
        socket.emit(nameEvent, message);
      }
    });
  }
}

const sendNotificationV2 = (students, activeUsers, users, message, nameEvent) => {
  for(let idStudent of students){
    //Versión v2.
    const userConnected = activeUsers.find((user) => user.user_id === idStudent.toString());
    //Si el usuario conectado se le emite la notificacion en tiempo real.
    if(userConnected && users[idStudent]){
      users[idStudent].emit(nameEvent, message);
    }

  }
}

module.exports = {
  sendNotificationV1,
  sendNotificationV2
}
