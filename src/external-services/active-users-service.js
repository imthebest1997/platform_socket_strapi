const axios = require("axios");

const getActiveUsers = async () => {
  try {
    const {data} = await axios.get(`http://localhost:1337/api/active-users/`);
    return data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log("Usuario no encontrado");
    }
  }
};

const createActiveUser = async (socketId, userId, token) => {
  try {
    const dataStrapi = {
      data:{
        socket_id: socketId,
        user_id: userId.toString()
      }
    };

    const {data, status} = await axios.post("http://localhost:1337/api/active-users/", dataStrapi,{
      headers: {
        Authorization: `Bearer ${token}`,
      }
    })
    return {data, status};
  } catch (error) {
    if (error.response && error.response.status === 500) {
      console.log("Error en el servidor");
    }else if(error.response && error.response.status === 400){
      console.log("Error en la petición");
    }else if(error.response && error.response.status === 403){
      console.log("No tienes permisos para realizar esta acción");
    }
  }
}

const updateActiveUser = async (socketId, userId, token) => {
  try {
    const userData = {
      socket_id: socketId,
      user_id: userId.toString()
    };
    
    const { data, status} = await axios.put("http://localhost:1337/api/active-users/", userData,{
      headers: {
        Authorization: `Bearer ${token}`,
      }
    });

    return { data, status};
  } catch (error) {
    if (error.response && error.response.status === 500) {
      console.log("Error en el servidor");
    }else if(error.response && error.response.status === 400){
      console.log("Error en la petición");
    }else if(error.response && error.response.status === 403){
      console.log("No tienes permisos para realizar esta acción");
    }
  }
}

const findUserInArray = async (data, userID) => {
  userID = userID.toString();
  const userConnected = data.filter((user) => user.user_id === userID);
  return userConnected;
}

module.exports = {
  getActiveUsers,
  createActiveUser,
  findUserInArray,
  updateActiveUser
};
