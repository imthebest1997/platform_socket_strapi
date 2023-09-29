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
      path: '/notifications/:idUser',
      handler: 'api::notification.notification.findNotificationsByUserId',
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
      method: 'PUT',
      path: '/notifications/statePanel/:id',
      handler: 'api::notification.notification.updateNotificationsByStatePanel',
    },
    {
      method: 'PUT',
      path: '/notifications/stateRead/:id',
      handler: 'api::notification.notification.updateNotificationByReadState',
    },
    {
      method: 'DELETE',
      path: '/notifications/:id',
      handler: 'api::notification.notification.delete',
    }
  ]
};
