'use strict';

/**
 * notification controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::notification.notification', ({ strapi }) => ({

  async find(ctx){
    try {
      const notifications = await strapi.db.query('api::notification.notification').findMany({
        populate: ['course', 'task']
      });
      return notifications;
    } catch (error) {
      strapi.log.error(
        "Error al consultar buscar notificaciones"
      );
      return ctx.throw(500, 'Ocurrió un error al buscar notificaciones.');
    }
  },

  async findNotificationsByCourse(ctx){
    const { course } = ctx.params;

    const courseFound = await strapi.db.query('api::courses.course').findOne({
      where: {id: course}
    });

    // const taskFound = await strapy.db.query('api::tasks.task').findOne({
    //   where: {id: course}
    // });

    const notifications = await strapi.db.query('api::notification.notification').findMany({
      where: {course: courseFound.id},
      populate: ['course', 'task']
    });

    return notifications;
  },

  async findOne(ctx){
    try {
      const { id } = ctx.params;

      // Consulta la notificación por su ID (asumiendo que tienes un modelo llamado 'notification')
      const notification = await strapi.db.query('api::notification.notification').findOne({
        where: {
          id: id
        },
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
