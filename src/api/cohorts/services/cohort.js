'use strict';

/**
 * cohort service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::cohorts.cohort');
