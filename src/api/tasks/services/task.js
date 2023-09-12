'use strict';

/**
 * task service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::tasks.task');
