'use strict';

/**
 * lessons service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::lessons.lesson');
