'use strict';

/**
 * active-user router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = {
  routes:[
    {
      method: 'GET',
      path: '/active-users',
      handler: 'api::active-user.active-user.find',
    },
    {
      method: 'GET',
      path: '/active-users/findByUser/:userID',
      handler: 'api::active-user.active-user.findActiveUsersByUserID',
    },
    {
      method: 'GET',
      path: '/active-users/:id',
      handler: 'api::active-user.active-user.findOne',
    },
    {
      method: 'POST',
      path: '/active-users',
      handler: 'api::active-user.active-user.create',
    },
    {
      method: 'PUT',
      path: '/active-users/',
      handler: 'api::active-user.active-user.update',
    },
    {
      method: 'DELETE',
      path: '/active-users/:userID',
      handler: 'api::active-user.active-user.delete',
    }
  ]
};
