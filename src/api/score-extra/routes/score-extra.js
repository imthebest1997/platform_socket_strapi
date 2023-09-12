'use strict';

/**
 * score-extra router
 */
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/score-extras',
      handler: 'api::score-extra.score-extra.find',
    },
    {
      method: 'GET',
      path: '/score-extras/:id',
      handler: 'api::score-extra.score-extra.findOne',
    },
    {
      method: 'GET',
      path: '/findWithCohort/:cohort',
      handler: 'api::score-extra.score-extra.findManyWithCohort',
    },
    {
      method: 'GET',
      path: '/findWithLabel',
      handler: 'api::score-extra.score-extra.findOneWithLabel',
    },
    {
      method: 'POST',
      path: '/score-extras',
      handler: 'api::score-extra.score-extra.create',
    },
    {
      method: 'PUT',
      path: '/score-extras/:id',
      handler: 'api::score-extra.score-extra.update',
    },
    {
      method: 'PUT',
      path: '/deleteScoreExtra',
      handler: 'api::score-extra.score-extra.deleteWithTitle',
    },
    {
      method: 'DELETE',
      path: '/score-extras/:id',
      handler: 'api::score-extra.score-extra.delete',
    },
  ],
};
