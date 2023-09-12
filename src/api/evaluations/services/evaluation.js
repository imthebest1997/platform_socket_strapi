'use strict';

/**
 * evaluations service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::evaluations.evaluation');
