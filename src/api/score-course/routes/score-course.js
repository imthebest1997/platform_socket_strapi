/**
 * user progress score routes.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/score-courses',
      handler: 'api::score-course.score-course.find',
    },
    /* {
      method: 'PUT',
      path: '/update-score-courses',
      handler: 'api::score-course.score-course.createCoursesScore',
    }, */
    {
      method: 'GET',
      path: '/score-courses/:id',
      handler: 'api::score-course.score-course.findOne',
    },
    {
      method: 'GET',
      path: '/score-courses-cohort/:cohort',
      handler: 'api::score-course.score-course.findOneWithCohort',
    },
    {
      method: 'POST',
      path: '/score-courses',
      handler: 'api::score-course.score-course.create',
    },
    {
      method: 'PUT',
      path: '/score-courses/:id',
      handler: 'api::score-course.score-course.update',
    },
    {
      method: 'DELETE',
      path: '/score-courses/:id',
      handler: 'api::score-course.score-course.delete',
    },
  ],
};
