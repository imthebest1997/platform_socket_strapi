'use strict';

/**
 * forum service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::forums.forum');
