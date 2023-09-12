'use strict';

/**
 * user-courses service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::user-courses.user-course');
