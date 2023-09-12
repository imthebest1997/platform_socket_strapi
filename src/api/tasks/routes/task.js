/**
 * task routes.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/tasks',
      handler: 'api::tasks.task.find',
    },
    {
      method: 'GET',
      path: '/tasks/:id',
      handler: 'api::tasks.task.findOne',
    },
    {
      method: 'GET',
      path: '/task/:courseSlug',
      handler: 'api::tasks.task.findTasksByCourse',
    },
    {
      method: 'POST',
      path: '/tasks',
      handler: 'api::tasks.task.create',
    },
    {
      method: 'PUT',
      path: '/tasks/:id',
      handler: 'api::tasks.task.update',
    },
    {
      method: 'PUT',
      path: '/deleteTaskWithCourse/:courseSlug',
      handler: 'api::tasks.task.deleteTaskRelationWithCourse',
    },
    {
      method: 'DELETE',
      path: '/tasks/:id',
      handler: 'api::tasks.task.delete',
    },
  ],
};
