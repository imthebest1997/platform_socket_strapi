'use strict';

/**
 * Lifecycle callbacks for the `score-course` model.
 */

const updatefinal_score = async (data) => {
  const { evaluations_score, lessons_score, games_score, tasks_score } = data;
  let resultScore = evaluations_score + lessons_score + games_score + tasks_score;
  data.more_score?.map((item) => {
    resultScore += parseInt(item.value);
  });
  data.maximun_score = resultScore;
};

const updateValueScore = async (data) => {
  const { id } = data;
  const result = await strapi.db.query('api::score-course.score-course').findOne({
    where: { id: id },
    populate: { cohort: { select: ['id'] } },
  });
  const { cohort } = result;
  const userFinalScore = await strapi.db.query('api::score-final-user.score-final-user').findMany({
    where: { cohort: cohort.id },
    populate: { user: { select: ['id', 'name'] } },
  });
  for (const userScore of userFinalScore) {
    await strapi.service('api::score-final-user.score-final-user').update(userScore.id, { data: userScore });
  }
};

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;
    await updatefinal_score(data);
  },
  async beforeUpdate(event) {
    let { data } = event.params;
    await updatefinal_score(data);
  },
  async afterUpdate(event) {
    let { result } = event;
    await updateValueScore(result);
  },
};
