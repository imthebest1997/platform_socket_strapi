/**
 * lessons custom routes.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/lessons',
      handler: 'api::lessons.lesson.find',
    },
    {
      method: 'GET',
      path: '/lessons/:id',
      handler: 'api::lessons.lesson.findOne',
    },
    {
      method: 'POST',
      path: '/lessons',
      handler: 'api::lessons.lesson.create',
    },
    {
      method: 'PUT',
      path: '/lessons/:id',
      handler: 'api::lessons.lesson.update',
    },
    {
      method: 'DELETE',
      path: '/lessons/:id',
      handler: 'api::lessons.lesson.delete',
    },
    {
      method: 'PUT',
      path: '/desactiveRelation',
      handler: 'api::lessons.lesson.deleteLesson',
    },
    {
      method: 'GET',
      path: '/lessons/:courseSlug/:lessonSlug',
      handler: 'api::lessons.lesson.findByCourseAndLessonSlug',
    },
    {
      method: 'PUT',
      path: '/lessonsGetPermissions/:cohort',
      handler: 'api::lessons.lesson.getPermissions',
    },
  ],
};
