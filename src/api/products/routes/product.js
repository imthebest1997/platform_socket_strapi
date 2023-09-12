/**
 * products custom routes.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/products',
      handler: 'api::products.product.find',
    },
    {
      method: 'GET',
      path: '/product/:slug',
      handler: 'api::products.product.findOne',
    },
    {
      method: 'POST',
      path: '/products',
      handler: 'api::products.product.create',
    },
    {
      method: 'PUT',
      path: '/products/:id',
      handler: 'api::products.product.update',
    },
    {
      method: 'DELETE',
      path: '/products/:id',
      handler: 'api::products.product.delete',
    },
  ],
};
