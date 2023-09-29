module.exports = async (students, activeUsers, socketsConnected, message, nameEvent) => {
  for (let idStudent of students) {
    const userConnected = activeUsers.find((user) => user.user_id === idStudent.toString());

    socketsConnected.forEach((socket) => {
      if (socket.id === userConnected?.socket_id && userConnected) {
        socket.emit(nameEvent, message);
        socket.emit("new_notifications", "New notifications");
      }
    });
  }
};
