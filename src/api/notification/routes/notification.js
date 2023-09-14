'use strict';

/**
 * notification router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/notifications',
      handler: 'api::notification.notification.find',
    },
    {
      method: 'GET',
      path: '/notifications/:course',
      handler: 'api::notification.notification.findNotificationsByCourse',
    },
    {
      method: 'GET',
      path: '/notifications/byId/:id',
      handler: 'api::notification.notification.findOne',
    },
    {
      method: 'POST',
      path: '/notifications',
      handler: 'api::notification.notification.create',
    },
    {
      method: 'PUT',
      path: '/notifications/:id',
      handler: 'api::notification.notification.update',
    },
    {
      method: 'DELETE',
      path: '/notifications/:id',
      handler: 'api::notification.notification.delete',
    }
  ]
};
