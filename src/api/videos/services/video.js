'use strict';

/**
 * videos service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::videos.video');
