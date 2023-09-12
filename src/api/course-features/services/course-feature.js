'use strict';

/**
 * course-features service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::course-features.course-feature');
