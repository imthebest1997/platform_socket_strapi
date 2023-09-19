'use strict';

/**
 * active-user controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::active-user.active-user', ({ strapi }) =>({

  async find(ctx){
    try {
      const activeUsers = await strapi.db.query('api::active-user.active-user').findMany();

      const activeUsersData = activeUsers.map((data)=>{
        const {createdAt, updatedAt, publishedAt, ...activeUser} = data;
        return activeUser;
      });

      return activeUsersData;
    } catch (error) {
      strapi.log.error(
        "Error al consultar buscar usuarios activos"
      );
      return ctx.throw(500, 'Ocurrió un error al buscar los usuarios conectados.');
    }
  },

  async findActiveUsersByUserID(ctx){
    const { userID } = ctx.params;

    const userActive = await strapi.db.query('api::active-user.active-user').findOne({
      where: {user_id: userID}
    });

    if (!userActive) {
      return ctx.send({ message: 'Usuario no encontrado' }, 404);
    }

    return userActive;
  },

  async findOne(ctx){
    try {
      const { id } = ctx.params;

      // Consulta la notificación por su ID (asumiendo que tienes un modelo llamado 'notification')
      const userActive = await strapi.db.query('api::active-user.active-user').findOne({
        where: {id: id}
      })

      if (!userActive) {
        return ctx.send({ message: 'Usuario activo no encontrado.' }, 404);
      }

      // Envia la notificación como respuesta
      return ctx.send(userActive);
    } catch (error) {
      // Maneja errores aquí si es necesario
      return ctx.throw(500, 'Ocurrió un error al buscar los datos del usuario.');
    }
  },

  async update(ctx){
    // Actualizar usuario
    const {user_id, socket_id } = ctx.request.body;


    // Consulta la notificación por su ID (asumiendo que tienes un modelo llamado 'notification')
    const userActive = await strapi.db.query('api::active-user.active-user').findOne({
      where: {user_id}
    });

    if (!userActive) {
      return ctx.send({ message: 'Usuario activo no encontrado.' }, 404);
    }

    await strapi.db.query('api::active-user.active-user').update({
      where: {user_id},
      data: { socket_id },
    });

    ctx.send({ message: 'Usuario actualizado con éxito' });
  }
}));
