/**
 * user courses custom routes.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/user-courses',
      handler: 'api::user-courses.user-course.findMyCourses',
    },
    {
      method: 'GET',
      path: '/user-courses/:courseSlug',
      handler: 'api::user-courses.user-course.findOne',
    },
    {
      method: 'POST',
      path: '/user-courses',
      handler: 'api::user-courses.user-course.create',
    },
    {
      method: 'PUT',
      path: '/user-courses/:id',
      handler: 'api::user-courses.user-course.update',
    },
    {
      method: 'DELETE',
      path: '/user-courses/:id',
      handler: 'api::user-courses.user-course.delete',
    },
  ],
};
