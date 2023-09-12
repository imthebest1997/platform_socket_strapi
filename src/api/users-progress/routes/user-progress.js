/**
 * user progresses custom routes.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/users-progress',
      handler: 'api::users-progress.user-progress.find',
    },
    {
      method: 'GET',
      path: '/users-progress/:courseSlug',
      handler: 'api::users-progress.user-progress.findBySlug',
    },
    {
      method: 'GET',
      path: '/users-progressGeneral/:courseSlug',
      handler: 'api::users-progress.user-progress.findUserProgressGeneral',
    },
    {
      method: 'POST',
      path: '/users-progress',
      handler: 'api::users-progress.user-progress.create',
    },
    {
      method: 'PUT',
      path: '/users-progress/:id',
      handler: 'api::users-progress.user-progress.update',
    },
    /*  {
      method: 'PUT',
      path: '/update-User-progress',
      handler: 'api::users-progress.user-progress.CreateRelationsUserProgress',
    }, */
    {
      method: 'PUT',
      path: '/userViewLesson',
      handler: 'api::users-progress.user-progress.findViewLesson',
    },
    {
      method: 'DELETE',
      path: '/users-progress/:id',
      handler: 'api::users-progress.user-progress.delete',
    },
  ],
};
