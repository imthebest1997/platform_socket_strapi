'use strict';

/**
 * Lifecycle callbacks for the `user-score-extra` model.
 */

const updateMoreScore = async ({ id, extra_note_id, score }) => {
  const userScoreExtra = await strapi.db.query('api::user-score-extra.user-score-extra').findOne({
    where: { id: id },
    populate: {
      cohort: { select: ['id'] },
      user: { select: ['id'] },
    },
  });
  const scoreExtra = await strapi.db.query('api::score-extra.score-extra').findOne({
    where: { id: extra_note_id },
  });
  const cohort = userScoreExtra?.cohort?.id;
  const user = userScoreExtra?.user?.id;
  const title = scoreExtra?.title;
  let scorefinal = await strapi.db.query('api::score-final-user.score-final-user').findOne({
    where: { cohort: cohort, user: user },
  });
  const { more_score_data } = scorefinal;
  for (const moreScore of more_score_data) {
    if (moreScore.title === title) {
      moreScore.score = score;
    }
  }
  await strapi.db.query('api::score-final-user.score-final-user').update({
    where: { id: scorefinal.id },
    data: scorefinal,
  });
};

module.exports = {
  async afterUpdate(event) {
    let { result } = event;
    await updateMoreScore(result);
  },
};
