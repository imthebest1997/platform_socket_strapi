'use strict';

/**
 * materials service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::materials.material');
