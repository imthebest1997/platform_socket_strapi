'use strict';

/**
 * score-course service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::score-course.score-course');
