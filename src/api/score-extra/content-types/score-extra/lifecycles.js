'use strict';

/**
 * Lifecycle callbacks for the `score-extra` model.
 */

const createUserScoreExtra = async ({ id }) => {
  const scoreExtra = await strapi.db.query('api::score-extra.score-extra').findOne({
    where: { id: id },
    populate: {
      cohort: { select: ['id'] },
    },
  });
  const cohort = scoreExtra?.cohort?.id;
  const studentsData = await strapi.db.query('api::cohorts.cohort').findOne({
    where: { id: cohort },
    populate: {
      students: { select: ['id'] },
    },
  });
  for (const student of studentsData?.students) {
    await strapi.db.query('api::user-score-extra.user-score-extra').create({
      data: {
        score: 1,
        cohort: studentsData.id,
        user: student,
        extra_note_id: id,
      },
    });
  }
};

module.exports = {
  async afterCreate(event) {
    let { result } = event;
    await createUserScoreExtra(result);
  },
};
