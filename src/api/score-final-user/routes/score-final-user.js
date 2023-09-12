/**
 * score final user routes.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/score-final-user',
      handler: 'api::score-final-user.score-final-user.find',
    },
    {
      method: 'PUT',
      path: '/created-certificated',
      handler: 'api::score-final-user.score-final-user.createCertificated',
    },
    {
      method: 'PUT',
      path: '/download-certificate',
      handler: 'api::score-final-user.score-final-user.downloadCertificate',
    },
    {
      method: 'GET',
      path: '/score-final-user-cohort/:cohort',
      handler: 'api::score-final-user.score-final-user.findScoreFinalByCohort',
    },
    {
      method: 'GET',
      path: '/my-score-final-cohort/:cohort',
      handler: 'api::score-final-user.score-final-user.findMyFinalScoreByCohort',
    },
    /* {
      method: 'PUT',
      path: '/update-score-final-user',
      handler: 'api::score-final-user.score-final-user.createUserScoreFinal',
    }, */
    {
      method: 'GET',
      path: '/score-final-user/:id',
      handler: 'api::score-final-user.score-final-user.findOne',
    },
    {
      method: 'POST',
      path: '/score-final-user',
      handler: 'api::score-final-user.score-final-user.create',
    },
    {
      method: 'PUT',
      path: '/score-final-user/:id',
      handler: 'api::score-final-user.score-final-user.update',
    },
    {
      method: 'DELETE',
      path: '/score-final-user/:id',
      handler: 'api::score-final-user.score-final-user.delete',
    },
  ],
};
