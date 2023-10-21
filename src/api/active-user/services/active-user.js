'use strict';

const { isEmpty } = require('lodash');

/**
 * active-user service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::active-user.active-user', ({ strapi }) => ({
  async getActiveUsers() {
    const result = await strapi.db.query('api::active-user.active-user').findMany({});
    return result;
  },

  async createOrUpdateActiveUser({ socket_id, user_id }) {
    const result = await strapi.db.query('api::active-user.active-user').findOne({
      where: { user_id: user_id }
    });

    if (!result) {
      await strapi.db.query('api::active-user.active-user').create({
        data: { user_id, socket_id, active: true }
      })
    } else {
      await strapi.db.query('api::active-user.active-user').update({
        where: { id: result.id },
        data: { user_id, socket_id, active: true }
      })
    }
  },

  async disconnectUser({ socket_id }) {
    await strapi.db.query('api::active-user.active-user').update({
      where: { socket_id: socket_id },
      data: { active: false }
    });
  },

  async forceDisconnectUser({ user_id }) {
    const { user: { id } } = user_id;
    await strapi.db.query('api::active-user.active-user').update({
      where: { user_id: id },
      data: { active: false }
    });
  },

  async getStatusbyId({ user_id }) {
    const result = await strapi.db.query('api::active-user.active-user').findOne({
      where: { user_id: user_id }
    });
    return result;
  }
}));
