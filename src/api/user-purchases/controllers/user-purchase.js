'use strict';
const { isEmpty } = require('lodash');
const uui = require('uuid');
/**
 *  user-purchases controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

const getProduct = async (product_id) => {
  strapi.log.debug('get product data from purchase session');
  const productData = await strapi.db.query('api::products.product').findOne({
    where: { product_id: product_id },
  });
  strapi.log.debug({ productData }, productData);
  return productData;
};

module.exports = createCoreController('api::user-purchases.user-purchase', ({ strapi }) => ({
  async findWithSession(ctx) {
    const { sessionId } = ctx.params;
    strapi.log.debug(
      { data: { userId: ctx.state.user.id, userEmail: ctx.state.user.email, session: sessionId } },
      'findWithSession for user-purchases started'
    );
    const result = await strapi.db.query('api::user-purchases.user-purchase').findOne({
      where: { session_id: sessionId, user: ctx.state.user.id },
      populate: {
        product: {
          select: ['id', 'slug'],
        },
        proof_of_payment: true,
      },
    });
    if (isEmpty(result)) {
      return ctx.forbidden('No tiene permisos para editar o visualizar este contenido');
    }
    strapi.log.info(`find one with session result: ${result ? 'Success' : 'Failed'}`);
    return result;
  },
  async findWithProductSlug(ctx) {
    const { productSlug } = ctx.params;
    strapi.log.debug(
      { data: { userId: ctx.state.user.id, userEmail: ctx.state.user.email, productSlug: productSlug } },
      'findWithProductId for user-purchases started'
    );
    const result = await strapi.db.query('api::user-purchases.user-purchase').findMany({
      where: { product: { slug: productSlug }, user: ctx.state.user.id },
      populate: ['product'],
    });

    strapi.log.info(`findWithProductId result: ${result ? 'Success' : 'Failed'}`);
    return result;
  },
  async createWireTransfer(ctx) {
    const { amount, product_id, price_id } = ctx.request.body;
    strapi.log.debug(
      { data: { userId: ctx.state.user.id, userEmail: ctx.state.user.email, product_id } },
      `create wire transfer for user-purchases start for user: ${ctx.state.user.email}`
    );
    const purchaseData = await strapi.db.query('api::user-purchases.user-purchase').findOne({
      where: { user: ctx.state.user.id, amount: amount, product_id: product_id, price_id: price_id },
    });
    if (purchaseData) {
      strapi.log.debug({ purchaseData }, 'get wire transfer data success');
      return purchaseData?.session_id;
    } else {
      const id = uui.v4();
      const product = await getProduct(product_id);
      const result = await strapi.service('api::user-purchases.user-purchase').create({
        data: {
          session_id: id,
          amount: amount,
          product: product.id,
          user: ctx.state.user.id,
          name: ctx.state.user?.name,
          last_name: ctx.state.user?.last_name,
          email: ctx.state.user?.email,
          payment_status: 'pending',
          has_physical_items: product?.has_physical_items,
          months_expiration: product?.expires_in,
          payment_method: 'Transfer',
          product_id: product_id,
          price_id: price_id,
          platform: true,
        },
      });
      strapi.log.debug(`crate wire transfer success: ${result}`);
      return id;
    }
  },
}));
