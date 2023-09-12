'use strict';
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_API_SECRET_KEY);
const unparsed = require('koa-body/unparsed.js');
/**
 *  stripe controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

const getProduct = async (checkoutSessionsId) => {
  strapi.log.debug('get product data from purchase session');
  const productID = await stripe.checkout.sessions.listLineItems(checkoutSessionsId, { limit: 1 });
  const { product } = productID?.data[0]?.price;
  const productData = await strapi.db.query('api::products.product').findOne({
    where: { product_id: product },
    populate: ['courses'],
  });
  strapi.log.debug({ productData }, productData);
  return productData;
};

const markUserPurchaseAsRefund = async (purchase) => {
  strapi.log.debug({ purchase }, 'markUserPurchaseAsRefund started');
  const { payment_intent } = purchase;
  await strapi.db.query('api::user-purchases.user-purchase').update({
    where: { payment_intent: payment_intent },
    data: { payment_status: 'refunded', refund_data: purchase },
  });
};

const registerOrUpdatePurchase = async (purchase) => {
  strapi.log.debug({ purchase }, 'register or update start, from user-purchases data');
  const { id, payment_status } = purchase;
  const result = await strapi.db.query('api::user-purchases.user-purchase').findOne({
    where: { session_id: id },
  });
  const entity = result || null;
  if (!entity) {
    await registerPurchase(purchase);
  } else {
    await strapi.db.query('api::user-purchases.user-purchase').update({
      where: { session_id: id },
      data: { payment_status: payment_status },
    });
  }
};

const registerPurchase = async (purchase) => {
  strapi.log.info({ purchase }, 'Register user-purchases data');
  const { id, amount_total, customer, payment_status, payment_intent } = purchase;
  const product = await getProduct(id);
  const user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { stripe_id: customer },
  });
  await strapi.service('api::user-purchases.user-purchase').create({
    data: {
      session_id: id,
      amount: amount_total,
      product: product?.id,
      product_id: product?.product_id,
      price_id: product?.price_id,
      user: user.id,
      name: user?.name,
      last_name: user?.last_name,
      email: user?.email,
      payment_status: payment_status,
      has_physical_items: product?.has_physical_items,
      months_expiration: product?.expires_in,
      payment_intent: payment_intent,
      payment_method: 'Card',
      checkout_session_data: purchase,
    },
    populate: ['user', 'product', 'product.courses'],
  });
};

module.exports = createCoreController('api::stripe.stripe', ({ strapi }) => ({
  async createPayment(ctx) {
    strapi.log.debug(
      { user: { id: ctx.state.user.id, email: ctx.state.user.email } },
      `create Payment started for user: '${ctx.state?.user.email}'`
    );
    const userId = ctx.state.user.id;
    let custom_id = ctx.state.user.stripe_id;
    if (!ctx.state.user.stripe_id) {
      const customer = await stripe.customers.create({
        name: ctx.state.user.name,
        email: ctx.state.user.email,
      });
      custom_id = customer.id;
      await strapi.db.query('plugin::users-permissions.user').update({
        where: { id: userId },
        data: { stripe_id: customer.id },
      });
    }
    return custom_id;
  },
  async hasPhysicalItems(ctx) {
    strapi.log.debug(
      { data: { userId: ctx.state.user.id, userEmail: ctx.state.user.email, session: ctx.params.sessionId } },
      `hasPhysicalItems started for user: '${ctx.state?.user.email}'`
    );
    const { sessionId } = ctx.params;
    const product = await getProduct(sessionId);
    return product?.has_physical_items;
  },
  async createCheckoutSession(ctx) {
    strapi.log.debug(`create checkout session started for user: ${ctx.state?.user.email}`);
    const { price_id, clientSecret, productSlug } = ctx.request.body;
    const session = await stripe.checkout.sessions.create({
      success_url: `${process.env.STRIPE_BASE_CALLBACK_URL || process.env.URL}/success/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.STRIPE_BASE_CALLBACK_URL || process.env.URL}/productos/${productSlug}`,
      payment_method_types: ['card'],
      mode: 'payment',
      customer: clientSecret,
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
    });
    strapi.log.debug(
      {
        user: { id: ctx.state.user.id, email: ctx.state.user.email },
        data: session,
      },
      `create checkout session for user: '${ctx.state?.user.email}'`
    );
    return session.id;
  },
  async webhookHandler(ctx) {
    strapi.log.debug('Webhook handler started');
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        ctx.request.body[unparsed],
        ctx.request.headers['stripe-signature'],
        process?.env?.STRIPE_SIGNING_SECRET
      );
      strapi.log.debug('Webhook handler create with success');
    } catch (err) {
      strapi.log.error({ reqId: ctx.state?.reqId, err }, '⚠️  Webhook signature verification failed.');
      strapi.log.error(
        {
          reqId: ctx.state?.reqId,
          err,
        },
        '⚠️  Check the env file and enter the correct webhook secret.'
      );
      return ctx.badRequest();
    }

    switch (event.type) {
      case 'payment_intent.created':
        strapi.log.info({ reqId: ctx.state?.reqId, eventData: event.data }, 'payment intent created');
        break;
      case 'payment_intent.succeeded':
        strapi.log.info({ reqId: ctx.state?.reqId, eventData: event.data }, 'payment intent succeeded');
        break;
      case 'checkout.session.completed':
        strapi.log.info({ reqId: ctx.state?.reqId, eventData: event.data }, 'checkout session completed');
        await registerOrUpdatePurchase(event.data.object);
        break;
      case 'charge.succeeded':
        strapi.log.info({ reqId: ctx.state?.reqId, eventData: event.data }, 'charge succeeded');
        break;
      case 'charge.refunded':
        strapi.log.info({ reqId: ctx.state?.reqId, eventData: event.data }, 'charge refunded');
        await markUserPurchaseAsRefund(event.data.object);
        break;
      default:
        strapi.log.error({ reqId: ctx.state?.reqId, eventData: event.data }, `Unhandled event, type ${event.type}`);
    }
    ctx.send({
      message: 'ok',
    });
  },
}));
