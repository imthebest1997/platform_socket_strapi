'use strict';

/**
 * countries service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::countries.country');
