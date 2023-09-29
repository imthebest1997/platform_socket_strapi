'use strict';

/**
 * notification controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::notification.notification', ({ strapi }) => ({

  async find(ctx){
    try {
      const notifications = await strapi.db.query('api::notification.notification').findMany({
        populate: ['user', 'cohort'],
        orderBy: [
          {
            fecha_emision: 'asc'
          },
        ],
      });

      return notifications;
    } catch (error) {
      strapi.log.error(
        `Error al consultar buscar notificaciones, ${error}`
      );
      return ctx.throw(500, 'Ocurrió un error al buscar notificaciones.');
    }
  },

  async findNotificationsByUserId(ctx){
    const { idUser } = ctx.params;

    try{
      const notifications = await strapi.db.query('api::notification.notification').findMany({
        where: {user: idUser},
        populate: ['user', 'cohort'],
        orderBy: [
          {
            fecha_emision: 'desc'
          },
        ],
      });
      return notifications;
    } catch (error) {
      strapi.log.error(
        `Error al consultar buscar notificaciones, ${error}`
      );
      return ctx.throw(500, 'Ocurrió un error al buscar notificaciones.');
    }
  },

  async updateNotificationsByStatePanel(ctx){
    const { id } = ctx.params;

    const notification = await strapi.db.query('api::notification.notification').findOne({
      where: {id: id},
    });

    //Si la notification no existe debera lanzar un error
    if(!notification){
      return ctx.throw(404, 'No existe la notificación.');
    }

    //Actualizar el isOpenPanel de notifications
    await strapi.db.query('api::notification.notification').update({
      where: {id: notification.id},
      data: {
        isOpenPanel: !notification.isOpenPanel
      }
    });

    return {
      message: "Se actualizaron las notificaciones correctamente"
    };
  },

  async updateNotificationByReadState(ctx){
    const { id } = ctx.params;

    const notification = await strapi.db.query('api::notification.notification').findOne({
      where: {id: id},
      populate: ['user']
    });

    //Si la notification no existe debera lanzar un error
    if(!notification){
      return ctx.throw(404, 'No existe la notificación.');
    }

    //Actualizar el isOpenPanel de notifications
    await strapi.db.query('api::notification.notification').update({
      where: {id: notification.id},
      data: {
        isRead: !notification.isRead
      }
    });

    const notifications = await strapi.db.query('api::notification.notification').findMany({
      where: {user: notification.user.id},
      populate: ['user', 'cohort']
    });

    return notifications;
  },

  async findOne(ctx){
    try {
      const { id } = ctx.params;

      // Consulta la notificación por su ID (asumiendo que tienes un modelo llamado 'notification')
      const notification = await strapi.db.query('api::notification.notification').findOne({
        where: {id: id},
        populate: ['course', 'task', 'foro','evaluacion', 'juego']
      })

      if (!notification) {
        return ctx.send({ message: 'Notificación no encontrada' }, 404);
      }

      // Envia la notificación como respuesta
      return ctx.send(notification);
    } catch (error) {
      // Maneja errores aquí si es necesario
      return ctx.throw(500, 'Ocurrió un error al buscar la notificación.');
    }
  }
}));
