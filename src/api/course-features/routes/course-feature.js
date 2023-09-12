/**
 * courses features custom routes.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/course-features',
      handler: 'api::course-features.course-feature.find',
    },
    {
      method: 'GET',
      path: '/course-features/:id',
      handler: 'api::course-features.course-feature.findOne',
    },
    {
      method: 'POST',
      path: '/course-features',
      handler: 'api::course-features.course-feature.create',
    },
    {
      method: 'PUT',
      path: '/course-features/:id',
      handler: 'api::course-features.course-feature.update',
    },
    {
      method: 'DELETE',
      path: '/course-features/:id',
      handler: 'api::course-features.course-feature.delete',
    },
  ],
};
