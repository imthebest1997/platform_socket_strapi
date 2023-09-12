/**
 * evaluations custom routes.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/evaluationsByCourse/:courseSlug',
      handler: 'api::evaluations.evaluation.find',
    },
    {
      method: 'GET',
      path: '/evaluationsResource/:courseSlug',
      handler: 'api::evaluations.evaluation.findResourceEvaluationsByCourse',
    },
    {
      method: 'GET',
      path: '/evaluations/:id',
      handler: 'api::evaluations.evaluation.findOne',
    },
    {
      method: 'POST',
      path: '/evaluations',
      handler: 'api::evaluations.evaluation.create',
    },
    {
      method: 'PUT',
      path: '/evaluations/:id',
      handler: 'api::evaluations.evaluation.update',
    },
    {
      method: 'DELETE',
      path: '/evaluations/:id',
      handler: 'api::evaluations.evaluation.delete',
    },
    {
      method: 'GET',
      path: '/evaluation/:courseSlug',
      handler: 'api::evaluations.evaluation.findEvaluationsByCourse',
    },
    {
      method: 'GET',
      path: '/evaluationExport/:courseSlug',
      handler: 'api::evaluations.evaluation.findSelectExportEvaluation',
    },
    {
      method: 'PUT',
      path: '/deleteEvaluationWithCourse/:courseSlug',
      handler: 'api::evaluations.evaluation.deleteEvaluationrelationWithCourse',
    },
    {
      method: 'POST',
      path: '/evaluations/score-test',
      handler: 'api::evaluations.evaluation.scoreTest',
    },
  ],
};
