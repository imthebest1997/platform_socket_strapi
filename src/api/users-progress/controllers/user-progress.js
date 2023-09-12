'use strict';

const { isEmpty } = require('lodash');

/**
 *  user-evaluation controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

const finishedCourse = async (generaldata, cohortData) => {
  let finished = false;
  if (
    generaldata.evaluations[0] == cohortData.references.evaluations.amount &&
    generaldata.tasks[0] == cohortData.references.tasks.amount &&
    generaldata.lessons[0] == cohortData.references.lessons.amount &&
    generaldata.games[0] == cohortData.references.games.amount
  ) {
    finished = true;
  }
  return finished;
};

const getReferencesAndPercentajeData = async (cohort, courseSlug) => {
  let cohortData, percentage;
  if (cohort) {
    cohortData = await strapi.db.query('api::cohorts.cohort').findOne({
      where: { id: cohort },
      populate: ['teachers'],
    });
    percentage = await strapi.db.query('api::score-course.score-course').findOne({
      where: { cohort: cohort },
    });
  } else {
    const courseData = await strapi.db
      .query('api::courses.course')
      .findOne({ where: { slug: courseSlug }, populate: { course_template: true } });
    const coursesId = courseData.course_template ? [courseData.id, courseData.course_template.id] : [courseData.id];
    const courseDataReferences = await strapi.service('api::courses.course').getEvaluationsAndTasks({ course: coursesId });
    cohortData = {
      references: courseDataReferences,
    };
    percentage = { maximun_score: 5, lessons_score: 1, evaluations_score: 1, tasks_score: 1, games_score: 1, more_score: [] };
  }
  return { cohortData, percentage };
};

const getUnseenLessons = async (courseFound, individualData, cohortData) => {
  const lessonActive = courseFound.lessons.map((lesson) => {
    if (!cohortData?.active_lessons?.includes(lesson.id)) {
      lesson.isBlocked = true;
    }
    return lesson;
  });
  const unseenLessons = lessonActive.filter((c) => !individualData.lessons?.includes(c.slug));
  return unseenLessons;
};

const getDataUniques = async (data, active_lessons) => {
  let newData = [];
  data.map((e) => {
    const { id, title, lessons } = e;
    if (e.lessons.length > 1) {
      lessons.map((lesson) => {
        var isBlocked = false;
        if (!active_lessons?.includes(lesson.id)) {
          isBlocked = true;
        }
        newData.push({
          id,
          title,
          slug: lesson.slug,
          level: e?.gameLevels || 10,
          isBlocked,
        });
      });
    } else {
      var isBlocked = false;
      if (!active_lessons?.includes(lessons[0].id)) {
        isBlocked = true;
      }
      newData.push({
        id,
        title,
        slug: lessons[0].slug,
        level: e?.gameLevels || 10,
        isBlocked,
      });
    }
  });
  return newData;
};

const getUnseenData = async (data, userData, item) => {
  const idList = userData.map((itemData) => parseInt(itemData[item]));
  const slugList = userData.map((itemData) => itemData?.lesson?.slug);
  const result = data.filter((dat) => {
    if (idList.includes(dat.id) && slugList.includes(dat.slug)) {
      return false;
    }
    return true;
  });
  return result;
};

const getUnseenEvaluations = async (courseFound, user, cohort, cohortData) => {
  let lessonsIds = courseFound.lessons.map((c) => c.id);
  let evaluations = await strapi.db.query('api::evaluations.evaluation').findMany({
    where: { lessons: lessonsIds },
    populate: { lessons: { select: ['slug', 'id'], where: { id: lessonsIds, resource: false } } },
  });
  const userEvaluations = await strapi.db
    .query('api::user-evaluations.user-evaluation')
    .findMany({ where: { cohort_id: cohort, user_id: user }, populate: { lesson: { select: ['slug'] } } });
  const uniqueEvaluations = await getDataUniques(evaluations, cohortData?.active_lessons);
  let result = [];
  if (isEmpty(userEvaluations)) {
    result = uniqueEvaluations;
  } else {
    result = await getUnseenData(uniqueEvaluations, userEvaluations, 'evaluation_id');
  }
  return result;
};

const getUnseenTasks = async (courseFound, user, cohort, cohortData) => {
  let lessonsIds = courseFound.lessons.map((c) => c.id);
  let tasks = await strapi.db.query('api::tasks.task').findMany({
    where: { lessons: lessonsIds },
    populate: { lessons: { select: ['slug', 'id'], where: { id: lessonsIds, resource: false } } },
  });
  const userTasks = await strapi.db
    .query('api::user-tasks.user-task')
    .findMany({ where: { cohort: cohort, user: user }, populate: { lesson: { select: ['slug'] } } });
  const uniqueTasks = await getDataUniques(tasks, cohortData?.active_lessons);
  let result = [];
  if (isEmpty(userTasks)) {
    result = uniqueTasks;
  } else {
    result = await getUnseenData(uniqueTasks, userTasks, 'task_id');
  }
  return result;
};

const getUnseenGames = async (courseFound, user, cohort, cohortData) => {
  let lessonsIds = courseFound.lessons.map((c) => c.id);
  let games = await strapi.db.query('api::games.game').findMany({
    where: { lessons: lessonsIds },
    populate: { lessons: { select: ['slug', 'id'], where: { id: lessonsIds, resource: false } } },
  });
  const userGames = await strapi.db
    .query('api::user-games.user-game')
    .findMany({ where: { cohort_id: cohort, user_id: user }, populate: { lesson: { select: ['slug'] } } });
  const uniqueGames = await getDataUniques(games, cohortData?.active_lessons);
  let result = [];
  if (isEmpty(userGames)) {
    uniqueGames.map((e) => {
      e.last_level = 0;
    });
    result = uniqueGames;
  } else {
    uniqueGames.map((e) =>
      userGames.map((ue) => {
        if (e.id === parseInt(ue.game_id) && e.slug === ue.lesson.slug) {
          if (ue.last_level === e.level) {
            e.delete = true;
          }
          e.last_level = ue.last_level || 0;
        }
      })
    );
    result = uniqueGames.filter((game) => game?.delete !== true);
  }
  return result;
};

const getCertificateCode = async (user, cohort) => {
  const userFinalScore = await strapi.db
    .query('api::score-final-user.score-final-user')
    .findOne({ where: { cohort: cohort, user: user } });
  return userFinalScore?.certificated_code || false;
};

module.exports = createCoreController('api::users-progress.user-progress', ({ strapi }) => ({
  async findBySlug(ctx) {
    const { courseSlug } = ctx.params;
    let cohort = ctx.query?.cohort ? ctx.query.cohort : null;
    let courseFound = await strapi.db.query('api::courses.course').findOne({
      where: { slug: courseSlug, active: true },
      populate: {
        course_template: {
          select: ['id'],
        },
      },
    });
    let coursesId = [courseFound.id];
    if (!courseFound?.is_template && courseFound?.course_template) {
      coursesId.push(courseFound.course_template.id);
    }

    let lessons = await strapi.db.query('api::lessons.lesson').findMany({
      select: ['id', 'title', 'description', 'slug', 'order'],
      where: { course_id: coursesId, active: true },
      orderBy: { order: 'asc' },
    });

    const userProgress = await strapi.db.query('api::users-progress.user-progress').findOne({
      where: { course: { slug: courseSlug }, cohort: cohort, user: ctx.state.user.id },
    });

    if (userProgress?.individual_data && lessons) {
      lessons.map((lesson) => {
        for (const lessonView of userProgress?.individual_data?.lessons) {
          if (lesson.slug == lessonView) {
            lesson.view = true;
          }
        }
      });
    }

    if (cohort) {
      const { cohortData } = await getReferencesAndPercentajeData(cohort, courseSlug);
      const { active_lessons } = cohortData;
      lessons = lessons.filter((lesson) => active_lessons.includes(lesson.id));
    }
    return lessons;
  },

  async findViewLesson(ctx) {
    const { courseSlug, lessonSlug } = ctx.request.body;
    let cohort = ctx.request.body?.cohort ? ctx.request.body.cohort : null;

    const userProgress = await strapi.db.query('api::users-progress.user-progress').findOne({
      where: { course: { slug: courseSlug }, cohort: cohort, user: ctx.state.user.id },
    });

    const lessonData = await strapi.db.query('api::lessons.lesson').findOne({
      where: { slug: lessonSlug },
    });
    const { cohortData } = await getReferencesAndPercentajeData(cohort, courseSlug);

    if (!lessonData.resource) {
      if (userProgress?.individual_data) {
        let data = userProgress.individual_data;
        let finished;
        if (!data.lessons.includes(lessonSlug)) {
          data.lessons.push(lessonSlug);
          userProgress.general_data.lessons[0] = userProgress.general_data.lessons[0] + 1;
          finished = await finishedCourse(userProgress.general_data, cohortData);
        } else {
          finished = await finishedCourse(userProgress.general_data, cohortData);
        }
        await strapi.service('api::users-progress.user-progress').update(userProgress.id, {
          data: { general_data: userProgress.general_data, individual_data: data, finished: finished },
        });
      } else {
        const lessonsview = { lessons: [lessonSlug] };
        userProgress.general_data.lessons[0] = userProgress.general_data.lessons[0] + 1;
        let finished = await finishedCourse(userProgress, cohortData);
        await strapi.service('api::users-progress.user-progress').update(userProgress.id, {
          data: { general_data: userProgress.general_data, individual_data: lessonsview, finished: finished },
        });
      }
    }

    ctx.send({
      message: 'ok',
    });
  },

  async findUserProgressGeneral(ctx) {
    const { courseSlug } = ctx.params;
    let cohort = ctx.query?.cohort ? ctx.query.cohort : null;
    const userProgress = await strapi.db.query('api::users-progress.user-progress').findOne({
      where: { course: { slug: courseSlug }, cohort: cohort, user: ctx.state.user.id },
    });
    const { cohortData, percentage } = await getReferencesAndPercentajeData(cohort, courseSlug);
    const moreScoreData = await strapi.db
      .query('api::score-final-user.score-final-user')
      .findOne({ where: { cohort: cohort, user: ctx.state.user.id } });
    const percentageScore = await strapi
      .service('api::users-progress.user-progress')
      .getPercentajeUser({ percentage: percentage, cohort: cohort, cohortData: cohortData, user: ctx.state.user.id });
    let courseFound = await strapi
      .service('api::courses.course')
      .getCourse({ slug: courseSlug, courseActive: [true], lessonActive: [true], resource: false, isTemplate: true });
    const unseenLessons = await getUnseenLessons(courseFound, userProgress.individual_data, cohortData);
    const unseenEvaluations = await getUnseenEvaluations(courseFound, ctx.state.user.id, cohort, cohortData);
    const unseenTasks = await getUnseenTasks(courseFound, ctx.state.user.id, cohort, cohortData);
    const unseenGames = await getUnseenGames(courseFound, ctx.state.user.id, cohort, cohortData);
    const certificated_code = await getCertificateCode(ctx.state.user.id, cohort);

    return {
      unseenLessons,
      unseenEvaluations,
      unseenTasks,
      unseenGames,
      certificated_code,
      moreScore: moreScoreData?.more_score_data,
      approved: moreScoreData?.approved,
      lessons: [cohortData.references.lessons.amount, userProgress?.general_data?.lessons[0]],
      evaluations: [cohortData.references.evaluations.amount, userProgress?.general_data?.evaluations[0]],
      tasks: [cohortData.references.tasks.amount, userProgress?.general_data?.tasks[0]],
      games: [cohortData.references.games.amount, userProgress?.general_data?.games[0]],
      percentage: percentageScore.finalPercentage,
    };
  },
  /*   async CreateRelationsUserProgress(ctx) {
    strapi.log.debug(
      { reqId: ctx.state.reqId },
      `update relations with user progress started for user: '${ctx.state?.user?.email}'`
    );
    //Retorna las relaciones entre usuarios y cursos, los cuales, tengan un curso y usuario asociado.
    const userCourses = await strapi.db.query('api::user-courses.user-course').findMany({
      where: { active: true, course_id: { $not: null }, user_id: { $not: null } },
      populate: { user_id: { select: ['id'] }, course_id: { select: ['id'] }, cohort_id: { select: ['id'] } },
    });
    for (const userCourse of userCourses) {
      const { user_id, course_id, cohort_id } = userCourse;
      await strapi
        .service('api::users-progress.user-progress')
        .create({ user: user_id?.id, course: course_id?.id, cohort: cohort_id?.id });
    }
    ctx.send({
      message: 'update relations users progress',
    });
  }, */
}));
