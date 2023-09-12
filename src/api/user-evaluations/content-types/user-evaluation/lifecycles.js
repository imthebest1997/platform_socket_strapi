'use strict';

/**
 * Lifecycle callbacks for the `user-evaluations` model.
 */

const getScoreObtainedAfterUpdate = async (params, data) => {
  const { evaluation_result } = data;
  let sumScore = 0;
  let sumScoreMax = 0;
  evaluation_result.map((result) => {
    sumScoreMax += result.original_evaluation.score;
    sumScore += result.finalScore;
  });
  let score_obtained = sumScore / evaluation_result.length;
  let score_obtained_max = sumScoreMax / evaluation_result.length;
  data.score_obtained = score_obtained;
  data.score_max = score_obtained_max;
};

const finishedEvaluation = async (params) => {
  const result = await strapi.db.query('api::user-evaluations.user-evaluation').findOne({
    where: { id: params.id },
    populate: {
      cohort_id: { select: ['id'] },
      user_id: { select: ['id'] },
      course: { select: ['id'] },
    },
  });
  const { cohort_id, user_id, course } = result;
  const userProgress = await strapi.db.query('api::users-progress.user-progress').findOne({
    where: { course: course?.id, user: user_id?.id, cohort: cohort_id?.id },
  });
  let { id, general_data } = userProgress;
  general_data.evaluations[0] = general_data.evaluations[0] + 1;
  await strapi.db.query('api::users-progress.user-progress').update({ where: { id: id }, data: { general_data: general_data } });
};

module.exports = {
  async beforeUpdate(event) {
    let { data, where } = event.params;
    if (!data.migrate) {
      getScoreObtainedAfterUpdate(where, data);
    }
  },
  async afterCreate(event) {
    const { result } = event;
    finishedEvaluation(result);
  },
};
