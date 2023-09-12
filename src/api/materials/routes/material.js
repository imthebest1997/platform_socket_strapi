/**
 * materials custom routes.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/materials',
      handler: 'api::materials.material.find',
    },
    {
      method: 'GET',
      path: '/materials/:id',
      handler: 'api::materials.material.findOne',
    },
    {
      method: 'POST',
      path: '/materials',
      handler: 'api::materials.material.create',
    },
    {
      method: 'PUT',
      path: '/materials/:id',
      handler: 'api::materials.material.update',
    },
    {
      method: 'DELETE',
      path: '/materials/:id',
      handler: 'api::materials.material.delete',
    },
  ],
};
