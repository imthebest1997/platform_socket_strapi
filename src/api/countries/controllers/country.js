'use strict';

/**
 *  countries controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::countries.country');
