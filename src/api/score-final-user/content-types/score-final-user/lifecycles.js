'use strict';

/**
 * Lifecycle callbacks for the `score-course` model.
 */

const getEvaluationsScore = async (user, courseId, cohort, evaluations_score) => {
  const user_evaluations = await strapi.db
    .query('api::user-evaluations.user-evaluation')
    .findMany({ where: { user_id: user, cohort_id: cohort } });
  const resultData = await strapi.db.query('api::evaluations.evaluation').findMany({
    where: { lessons: { course_id: courseId } },
  });
  let score = 0,
    max_score = 0;
  for (const evaluation of resultData) {
    max_score += evaluation.score;
  }
  for (const user_evaluation of user_evaluations) {
    score += user_evaluation.score_obtained;
  }
  var final_score = (evaluations_score / max_score) * score || 0;
  final_score = parseFloat(final_score.toFixed(2));
  score = parseFloat(score.toFixed(2));
  return { score, final_score, amount: max_score, total: resultData.length, view: user_evaluations.length };
};

const getTasksScore = async (user, courseId, cohort, tasks_score) => {
  const user_tasks = await strapi.db.query('api::user-tasks.user-task').findMany({ where: { user: user, cohort: cohort } });
  let score = 0;
  const resultData = await strapi.db.query('api::tasks.task').findMany({
    where: { lessons: { course_id: courseId } },
  });
  for (const user_task of user_tasks) {
    score += user_task.score;
  }
  var final_score = (tasks_score / (resultData.length * 10)) * score || 0;
  final_score = parseFloat(final_score.toFixed(2));
  return { score, final_score, amount: resultData.length * 10, total: resultData.length, view: user_tasks.length };
};

const getLessonsScore = async (user_progress, lessons_score, cohortData) => {
  const { references } = cohortData;
  const { general_data } = user_progress;
  var final_score = (general_data.lessons[0] * lessons_score) / references?.lessons?.amount || 0;
  final_score = parseFloat(final_score.toFixed(2));
  return { amount: general_data.lessons[0], total: references.lessons.amount, final_score };
};

const getGamesScore = async (user_progress, games_score, cohortData) => {
  const { references } = cohortData;
  const { general_data } = user_progress;
  var final_score = (general_data.games[0] * games_score) / references?.games?.amount || 0;
  final_score = parseFloat(final_score.toFixed(2));
  return { amount: general_data.games[0], total: references.games.amount, final_score };
};

const getMoreScore = async (more_score, more_score_data_result) => {
  let final_score = 0;
  let more_score_data = [];
  for (let i = 0; i < more_score.length; i++) {
    let weigth_score = (more_score[i]?.value / 10) * more_score_data_result[i].score;
    weigth_score = Number.isInteger(weigth_score) ? parseInt(weigth_score) : parseFloat(weigth_score.toFixed(2));
    more_score_data_result[i].final_score = weigth_score;
    final_score += weigth_score;
    more_score_data.push({
      title: more_score[i].title,
      totalScore: more_score[i].value,
      maxScore: 10,
      score: more_score_data_result[i].score,
      final_score: weigth_score,
    });
  }
  return { final_score, more_score_data, more_score_data_result };
};

const getUserAndCohortId = async (id) => {
  const data = await strapi.db
    .query('api::score-final-user.score-final-user')
    .findOne({ where: { id: id }, populate: { user: { select: ['id'] }, cohort: { select: ['id'] } } });
  let user = data.user.id,
    cohort = data.cohort.id;
  return { user, cohort };
};

const getApproved = async (final_score, pass_score) => {
  return final_score >= pass_score;
};

const getUpdateMoreScore = async (more_score) => {
  let more_score_data = [];
  for (const more of more_score) {
    more_score_data.push({ label: more.title, score: 1, final_score: 1 });
  }
  return more_score_data;
};

const getUpdateMoreScoreBeforeUpdate = async (more_score, more_score_data) => {
  let more_final_score_data = [];
  for (let i = 0; i < more_score.length; i++) {
    if (i < more_score_data.length) {
      more_final_score_data.push({
        title: more_score[i].title,
        score: more_score_data[i].score,
        final_score: more_score_data[i].final_score,
      });
    } else {
      more_final_score_data.push({ label: more_score[i].title, score: 1, final_score: 1 });
    }
  }
  return more_final_score_data;
};

const updatefinalScoreBeforeCreate = async (data) => {
  let { cohort, user } = data;
  cohort = cohort?.connect ? cohort.connect[0].id : cohort;
  user = user?.connect ? user.connect[0].id : user;
  strapi.log.debug(`Iniciando el ciclo de vida para el usuario: ${user}, cohort: ${cohort}`);
  const percentageScore = await strapi.db
    .query('api::score-course.score-course')
    .findOne({ where: { cohort: cohort }, populate: { cohort: { select: ['id', 'references'] } } });
  const user_progress = await strapi.db
    .query('api::users-progress.user-progress')
    .findOne({ where: { user: user, cohort: cohort } });
  const { evaluations_score, tasks_score, more_score, lessons_score, games_score, pass_score } = percentageScore;
  let evaluationsScore = await getEvaluationsScore(user, cohort, evaluations_score);
  let tasksScore = await getTasksScore(user, cohort, tasks_score);
  let lessonsScore = await getLessonsScore(user_progress, lessons_score, percentageScore.cohort);
  let gamesScore = await getGamesScore(user_progress, games_score, percentageScore.cohort);
  let updateMoreScore = await getUpdateMoreScore(more_score);
  let moreScore = await getMoreScore(more_score, updateMoreScore);
  const scoreData = {
    evaluationsScore,
    tasksScore,
    lessonsScore,
    gamesScore,
    moreScore: moreScore.more_score_data,
  };
  data.user_score = scoreData;
  data.final_score =
    evaluationsScore.final_score +
    tasksScore.final_score +
    lessonsScore.final_score +
    gamesScore.final_score +
    moreScore.final_score;
  data.more_score_data = moreScore.more_score_data_result;
  data.approved = await getApproved(data.final_score, pass_score);
};

const updatefinalScoreBeforeUpdate = async (data, where) => {
  const { more_score_data } = data;
  const { user, cohort } = await getUserAndCohortId(where?.id);
  const percentageScore = await strapi.db.query('api::score-course.score-course').findOne({
    where: { cohort: cohort },
    populate: {
      cohort: {
        select: ['id', 'references'],
        populate: { course: { select: ['id'], populate: { course_template: { select: ['id'] } } } },
      },
    },
  });
  const { evaluations_score, tasks_score, more_score, lessons_score, games_score, pass_score } = percentageScore;
  const user_progress = await strapi.db
    .query('api::users-progress.user-progress')
    .findOne({ where: { user: user, cohort: cohort } });
  let coursesId = percentageScore.cohort.course?.course_template?.id
    ? [percentageScore.cohort.course.id, percentageScore.cohort.course?.course_template?.id]
    : [percentageScore.cohort.course.id];
  let evaluationsScore = await getEvaluationsScore(user, coursesId, cohort, evaluations_score);
  let tasksScore = await getTasksScore(user, coursesId, cohort, tasks_score);
  let lessonsScore = await getLessonsScore(user_progress, lessons_score, percentageScore.cohort);
  let gamesScore = await getGamesScore(user_progress, games_score, percentageScore.cohort);
  let updateMoreScore = await getUpdateMoreScoreBeforeUpdate(more_score, more_score_data);
  let moreScore = await getMoreScore(more_score, updateMoreScore);
  const scoreData = {
    evaluationsScore,
    tasksScore,
    lessonsScore,
    gamesScore,
    moreScore: moreScore.more_score_data,
  };
  data.user_score = scoreData;
  data.final_score =
    evaluationsScore.final_score +
    tasksScore.final_score +
    lessonsScore.final_score +
    gamesScore.final_score +
    moreScore.final_score;
  data.more_score_data = moreScore.more_score_data_result;
  data.approved = await getApproved(data.final_score, pass_score);
};

module.exports = {
  async beforeCreate(event) {
    let { data } = event.params;
    await updatefinalScoreBeforeCreate(data);
  },
  async beforeUpdate(event) {
    let { data, where } = event.params;
    if (!data.update) {
      await updatefinalScoreBeforeUpdate(data, where);
    }
  },
};
