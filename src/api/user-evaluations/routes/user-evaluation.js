/**
 * user evaluation custom routes.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/user-evaluations',
      handler: 'api::user-evaluations.user-evaluation.find',
    },
    {
      method: 'GET',
      path: '/user-evaluation/:id',
      handler: 'api::user-evaluations.user-evaluation.findOne',
    },
    {
      method: 'GET',
      path: '/user-evaluations/:courseSlug',
      handler: 'api::user-evaluations.user-evaluation.findUserEvaluationWithCourseSlug',
    },
    {
      method: 'GET',
      path: '/my-evaluations/:courseSlug',
      handler: 'api::user-evaluations.user-evaluation.findMyEvaluationsWithCourseSlug',
    },
    {
      method: 'POST',
      path: '/user-evaluations',
      handler: 'api::user-evaluations.user-evaluation.create',
    },
    {
      method: 'PUT',
      path: '/user-evaluations/:id',
      handler: 'api::user-evaluations.user-evaluation.update',
    },
    {
      method: 'DELETE',
      path: '/user-evaluations/:id',
      handler: 'api::user-evaluations.user-evaluation.delete',
    },
    {
      method: 'GET',
      path: '/user-evaluations-data',
      handler: 'api::user-evaluations.user-evaluation.findByEvaluation',
    },
  ],
};
