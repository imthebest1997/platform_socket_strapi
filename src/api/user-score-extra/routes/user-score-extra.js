'use strict';

/**
 * user-score-extra router
 */
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/user-score-extras',
      handler: 'api::user-score-extra.user-score-extra.find',
    },
    {
      method: 'GET',
      path: '/user-score-extras/:id',
      handler: 'api::user-score-extra.user-score-extra.findOne',
    },
    {
      method: 'GET',
      path: '/findExtraNotesWithCohort/:cohort',
      handler: 'api::user-score-extra.user-score-extra.findManyWithCohort',
    },
    {
      method: 'GET',
      path: '/findMyExtraScore/:cohort',
      handler: 'api::user-score-extra.user-score-extra.findMyUserExtraScore',
    },
    {
      method: 'POST',
      path: '/user-score-extras',
      handler: 'api::user-score-extra.user-score-extra.create',
    },
    {
      method: 'PUT',
      path: '/user-score-extras/:id',
      handler: 'api::user-score-extra.user-score-extra.update',
    },
    {
      method: 'DELETE',
      path: '/user-score-extras/:id',
      handler: 'api::user-score-extra.user-score-extra.delete',
    },
  ],
};
