'use strict';

/**
 * user-game service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::user-games.user-game');
