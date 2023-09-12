'use strict';

/**
 * user-purchases service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::user-purchases.user-purchase');
