'use strict';

/**
 * score-final-user service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::score-final-user.score-final-user', ({ strapi }) => ({
  async create(ctx) {
    const { user, cohort } = ctx;
    const result = await strapi.db
      .query('api::score-final-user.score-final-user')
      .findOne({ where: { cohort: cohort, user: user } });
    if (!result) {
      await strapi.db.query('api::score-final-user.score-final-user').create({
        data: {
          cohort: cohort,
          user: user,
          more_score_data: [],
          user_score: {},
          approved: false,
          final_score: 1,
        },
      });
    }
  },
}));
