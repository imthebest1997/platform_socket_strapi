/**
 * user task custom routes.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/user-tasks',
      handler: 'api::user-tasks.user-task.find',
    },
    {
      method: 'GET',
      path: '/user-task/:id',
      handler: 'api::user-tasks.user-task.findOne',
    },
    {
      method: 'GET',
      path: '/user-tasks/:courseSlug',
      handler: 'api::user-tasks.user-task.findUserTaskWithCourseSlug',
    },
    {
      method: 'GET',
      path: '/my-tasks/:courseSlug',
      handler: 'api::user-tasks.user-task.findMyTaskWithCourseSlug',
    },
    {
      method: 'POST',
      path: '/user-task',
      handler: 'api::user-tasks.user-task.findOneOrCreate',
    },
    {
      method: 'POST',
      path: '/user-tasks',
      handler: 'api::user-tasks.user-task.create',
    },
    {
      method: 'PUT',
      path: '/user-tasks/:id',
      handler: 'api::user-tasks.user-task.update',
    },
    {
      method: 'DELETE',
      path: '/user-tasks/:id',
      handler: 'api::user-tasks.user-task.delete',
    },
  ],
};
