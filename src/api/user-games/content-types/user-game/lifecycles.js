'use strict';
/**
 * Lifecycle callbacks for the `user-games` model.
 */

const updateGamesLevel = async (result) => {
  const dataGame = await strapi.db.query('api::user-games.user-game').findOne({
    where: { id: result.id },
    populate: { cohort_id: { select: ['id'] }, course: { select: ['id'] }, user_id: { select: ['id'] } }
  });
  const { cohort_id, course, user_id } = dataGame;
  const userProgress = await strapi.db.query('api::users-progress.user-progress').findOne({
    where: { course: course?.id, user: user_id?.id, cohort: cohort_id?.id },
  });
  const levelsGames = await strapi.db.query('api::user-games.user-game').findMany({
    where: { cohort_id: cohort_id?.id, course: course?.id, user_id: user_id?.id },
  });
  let levelsFinal = 0;
  for (const level of levelsGames) {
    levelsFinal += level.last_level;
  }
  let { id, general_data } = userProgress;
  general_data.games[0] = levelsFinal;
  await strapi.db.query('api::users-progress.user-progress').update({ where: { id: id }, data: { general_data: general_data } });
};

module.exports = {
  async afterUpdate(event) {
    const { result } = event;
    await updateGamesLevel(result);
  },
};
