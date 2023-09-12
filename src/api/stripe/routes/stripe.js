/**
 * products custom routes.
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/stripe/create-payment-intent',
      handler: 'stripe.createPayment',
    },
    {
      method: 'POST',
      path: '/stripe/create-checkout-session',
      handler: 'stripe.createCheckoutSession',
    },
    {
      method: 'POST',
      path: '/stripe/webhook',
      handler: 'stripe.webhookHandler',
    },
    {
      method: 'GET',
      path: '/stripe/hasPhysicalItems/:sessionId',
      handler: 'stripe.hasPhysicalItems',
    },
  ],
};
