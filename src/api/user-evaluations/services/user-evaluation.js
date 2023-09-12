'use strict';

/**
 * user-evaluation service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::user-evaluations.user-evaluation');
