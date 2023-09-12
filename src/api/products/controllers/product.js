'use strict';
const geoip = require('geoip-lite');

/**
 *  products controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::products.product', ({ strapi }) => ({
  async find(ctx) {
    const customerIp = ctx.request.ip;
    strapi.log.debug(`Get Products where Customer IP: ${customerIp}`);
    const geo = geoip.lookup(customerIp);
    const country = geo?.country;
    const orCondition = [];
    if (country) {
      orCondition.push(country);
    }
    orCondition.push('default');

    let productsFound = await strapi.db.query('api::products.product').findMany({
      where: { countries: { code: orCondition } },
      populate: ['image', 'countries', 'courses'],
    });

    productsFound?.forEach((product) => (product.category = product.courses[0].category));

    strapi.log.debug(
      `Products found ids: [${productsFound?.map(
        (productFound) => productFound.id
      )}] for ip: ${customerIp}, countries: ${orCondition.map((country) => country)}`
    );

    return productsFound;
  },
  async findOne(ctx) {
    const { slug } = ctx.params;
    const customerIp = ctx.request.ip;
    var geo = geoip.lookup(customerIp);
    const country = geo?.country;
    const orCondition = [];
    if (country) {
      orCondition.push(country);
    }
    orCondition.push('default');

    const productFound = await strapi.db.query('api::products.product').findOne({
      where: { countries: { code: orCondition }, slug: slug },
      populate: ['image', 'countries', 'courses'],
    });
    if (!productFound) {
      return ctx.notFound('No se encontró el producto buscado o no está disponible para tu país');
    }

    return productFound;
  },
}));
