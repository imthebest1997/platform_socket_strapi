/**
 * courses custom routes.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/courses',
      handler: 'api::courses.course.find',
    },
    {
      method: 'POST',
      path: '/courses',
      handler: 'api::courses.course.create',
    },
    {
      method: 'PUT',
      path: '/courses/:id',
      handler: 'api::courses.course.update',
    },
    {
      method: 'DELETE',
      path: '/courses/:id',
      handler: 'api::courses.course.delete',
    },
    {
      method: 'GET',
      path: '/course/:slug',
      handler: 'api::courses.course.findBySlugTeacher',
    },
    {
      method: 'GET',
      path: '/courses/:slug',
      handler: 'api::courses.course.findBySlug',
    },
    {
      method: 'GET',
      path: '/coursesfindPermissions/:slug',
      handler: 'api::courses.course.findLessonsPermission',
    },
    {
      method: 'GET',
      path: '/coursesResources/:slug',
      handler: 'api::courses.course.findResources',
    },
  ],
};
