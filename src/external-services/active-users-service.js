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

module.exports = {
  getActiveUsers,
};
