'use strict';

/**
 * user-score-extra service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::user-score-extra.user-score-extra', ({ strapi }) => ({
  async deleteWithScoreExtra(ctx) {
    const { noteId } = ctx;
    const userExtras = await strapi.db
      .query('api::user-score-extra.user-score-extra')
      .findMany({ where: { extra_note_id: noteId } });
    for (const userExtra of userExtras) {
      await strapi.db.query('api::user-score-extra.user-score-extra').delete({ where: { id: userExtra.id } });
    }
    await strapi.db.query('api::score-extra.score-extra').deleteMany({ where: { id: noteId } });
  },
}));
