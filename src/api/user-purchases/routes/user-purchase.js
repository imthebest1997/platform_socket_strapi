/**
 * user purchases custom routes.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/user-purchases',
      handler: 'api::user-purchases.user-purchase.find',
    },
    {
      method: 'GET',
      path: '/user-purchase/:sessionId',
      handler: 'api::user-purchases.user-purchase.findWithSession',
    },
    {
      method: 'GET',
      path: '/user-purchases-product/:productSlug',
      handler: 'api::user-purchases.user-purchase.findWithProductSlug',
    },
    {
      method: 'POST',
      path: '/user-purchases',
      handler: 'api::user-purchases.user-purchase.create',
    },
    {
      method: 'POST',
      path: '/user-purchases/createWireTransfer',
      handler: 'api::user-purchases.user-purchase.createWireTransfer',
    },
    {
      method: 'PUT',
      path: '/user-purchases/:id',
      handler: 'api::user-purchases.user-purchase.update',
    },
    {
      method: 'DELETE',
      path: '/user-purchases/:id',
      handler: 'api::user-purchases.user-purchase.delete',
    },
  ],
};
