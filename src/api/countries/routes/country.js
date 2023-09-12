/**
 * countries custom routes.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/countries',
      handler: 'api::countries.country.find',
    },
    {
      method: 'GET',
      path: '/countries/:id',
      handler: 'api::countries.country.findOne',
    },
    {
      method: 'POST',
      path: '/countries',
      handler: 'api::countries.country.create',
    },
    {
      method: 'PUT',
      path: '/countries/:id',
      handler: 'api::countries.country.update',
    },
    {
      method: 'DELETE',
      path: '/countries/:id',
      handler: 'api::countries.country.delete',
    },
  ],
};
