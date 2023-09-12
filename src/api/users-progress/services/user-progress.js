'use strict';

/**
 * user-progresses service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

const getViewsEvaluations = async (user, cohort, course, viewLessons) => {
  const user_evaluations = await strapi.db
    .query('api::user-evaluations.user-evaluation')
    .findMany({ where: { user_id: user, cohort_id: cohort, course: course }, populate: { lesson: { select: ['slug'] } } });
  user_evaluations?.map((ue) => {
    if (!viewLessons.includes(ue?.lesson?.slug)) {
      viewLessons.push(ue?.lesson?.slug);
    }
  });

  return { amount: user_evaluations?.length || 0, viewLessons: viewLessons };
};

const getViewsTasks = async (user, cohort, course, viewLessons) => {
  const user_tasks = await strapi.db
    .query('api::user-tasks.user-task')
    .findMany({ where: { user: user, cohort: cohort, course: course }, populate: { lesson: { select: ['slug'] } } });
  user_tasks?.map((ut) => {
    if (!viewLessons.includes(ut?.lesson?.slug)) {
      viewLessons.push(ut?.lesson?.slug);
    }
  });
  return { amount: user_tasks?.length || 0, viewLessons: viewLessons };
};

const getLevelsGames = async (user, cohort, course, viewLessons) => {
  let levels = 0;
  const user_games = await strapi.db
    .query('api::user-games.user-game')
    .findMany({ where: { user_id: user, cohort_id: cohort, course: course }, populate: { lesson: { select: ['slug'] } } });
  for (const user_game of user_games) {
    levels += user_game.last_level;
    if (!viewLessons.includes(user_game?.lesson?.slug)) {
      viewLessons.push(user_game?.lesson?.slug);
    }
  }
  return { amount: levels, viewLessons: viewLessons };
};

const getPercentajeWithItem = (final_score, item_score, data, cohort, item) => {
  const percentajeItem = (item_score * 100) / final_score;
  if (cohort.references[item].amount === 0) {
    return { score: 0 };
  }
  const score = (data[0] * percentajeItem) / cohort.references[item].amount || 0;
  return { score, percentajeItem };
};

const getPercentajeGames = async (final_score, item_score, cohort, user, cohortData, item) => {
  const percentajeItem = (item_score * 100) / final_score;
  if (cohortData.references[item].amount === 0) {
    return { score: 0 };
  }
  const levelsGames = await strapi.db.query('api::user-games.user-game').findMany({
    where: { cohort_id: cohort, user_id: user },
  });
  let levelsFinal = 0;
  for (const level of levelsGames) {
    levelsFinal += level.last_level;
  }
  const score = (levelsFinal * percentajeItem) / cohortData.references[item].amount || 0;
  return { score, percentajeItem };
};

const getMoreScore = (final_score, item_score, userScore) => {
  if (userScore === 1) {
    return 0;
  }
  const percentajeItem = (item_score * 100) / final_score;
  return percentajeItem;
};

const getTotalPercentaje = async (general_data, percentage, cohort, cohortData, user) => {
  const { maximun_score, lessons_score, evaluations_score, tasks_score, games_score, more_score } = percentage;
  const percentageLessons = getPercentajeWithItem(maximun_score, lessons_score, general_data.lessons, cohortData, 'lessons');
  const percentageEvaluations = getPercentajeWithItem(
    maximun_score,
    evaluations_score,
    general_data.evaluations,
    cohortData,
    'evaluations'
  );
  const percentageTasks = getPercentajeWithItem(maximun_score, tasks_score, general_data.tasks, cohortData, 'tasks');
  const percentageGames = await getPercentajeGames(maximun_score, games_score, cohort, user, cohortData, 'games');
  let moreScore = 0;
  let moreScoreData = [];
  const userMoreScore = await strapi.db
    .query('api::score-final-user.score-final-user')
    .findOne({ where: { user: user, cohort: cohort } });
  const more_score_data = userMoreScore?.more_score_data || [];
  for (var i = 0; i < more_score_data.length; i++) {
    const moreScoreAux = getMoreScore(maximun_score, more_score[i].value, more_score_data[i].score);
    moreScoreData.push({ title: more_score[i].title, percentage: moreScoreAux });
    moreScore += moreScoreAux;
  }
  const dataPercentage = {
    evaluationsPercentage: {
      score: parseFloat(percentageEvaluations.score.toFixed(2)),
      total: parseFloat(percentageEvaluations.percentajeItem?.toFixed(2)),
    },
    lessonsPercentage: {
      score: parseFloat(percentageLessons.score.toFixed(2)),
      total: parseFloat(percentageLessons.percentajeItem?.toFixed(2)),
    },
    gamesPercentage: {
      score: parseFloat(percentageGames.score.toFixed(2)),
      total: parseFloat(percentageGames.percentajeItem?.toFixed(2)),
    },
    tasksPercentage: {
      score: parseFloat(percentageTasks.score.toFixed(2)),
      total: parseFloat(percentageTasks.percentajeItem?.toFixed(2)),
    },
    moreScoreData,
  };
  const percentageFinal =
    percentageLessons.score + percentageEvaluations.score + percentageTasks.score + percentageGames.score + moreScore;
  return { dataPercentage, percentageFinal };
};

module.exports = createCoreService('api::users-progress.user-progress', ({ strapi }) => ({
  async create(ctx) {
    let { user, course, cohort } = ctx;
    cohort = cohort ? cohort : null;
    const result = await strapi.db.query('api::users-progress.user-progress').findOne({
      where: { course: course, cohort: cohort, user: user },
    });
    if (!result) {
      strapi.log.debug(`Create data to user: ${user}, cohort: ${cohort}, course: ${course}`);
      const seeEvaluations = await getViewsEvaluations(user, cohort, course, []);
      const seetasks = await getViewsTasks(user, cohort, course, seeEvaluations.viewLessons);
      const seegames = await getLevelsGames(user, cohort, course, seetasks.viewLessons);
      const { viewLessons } = seegames;
      const generaldata = {
        evaluations: [seeEvaluations.amount],
        tasks: [seetasks.amount],
        games: [seegames.amount],
        lessons: [viewLessons.length],
      };
      const individual_data = {
        lessons: viewLessons,
      };
      await strapi.db.query('api::users-progress.user-progress').create({
        data: {
          user: user,
          course: course,
          cohort: cohort,
          finished: false,
          general_data: generaldata,
          individual_data: individual_data,
          max_score: 4,
        },
      });
    } else {
      const generaldata = {
        evaluations: [result.general_data.evaluations[0]],
        tasks: [result.general_data.tasks[0]],
        games: [result.general_data.games[0]],
        lessons: [result.general_data.lessons[0]],
      };
      await strapi.service('api::users-progress.user-progress').update(result.id, { data: { general_data: generaldata } });
    }
  },
  async getPercentajeUser(ctx) {
    let { percentage, cohort, cohortData, user } = ctx;
    const userProgress = await strapi.db
      .query('api::users-progress.user-progress')
      .findOne({ where: { cohort: cohort, user: user } });
    const percentage_final = await getTotalPercentaje(userProgress.general_data, percentage, cohort, cohortData, user);
    const { dataPercentage, percentageFinal } = percentage_final;
    const finalPercentage = parseFloat(percentageFinal.toFixed(2));
    return { finalPercentage, dataPercentage };
  },
}));
