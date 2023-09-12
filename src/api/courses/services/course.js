'use strict';

/**
 * courses service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

const getAmountEvaluationsTasks = async (idCourses, collection, idLessons) => {
  const resultData = await strapi.db.query(collection).findMany({
    where: { lessons: { course_id: idCourses, resource: false } },
    populate: { lessons: { select: ['id'], filters: { id: idLessons } } }
  });
  let itemAmount = 0;
  resultData.map((g) => {
    itemAmount += g.lessons.length;
  });
  var data = resultData?.filter((arr, index, self) => index === self.findIndex((t) => t.id === arr.id));
  return { amount: itemAmount, ids: data.map((collec) => collec.id) };
};

const getAmountGames = async (idCourses) => {
  const resultData = await strapi.db.query('api::games.game').findMany({
    where: { lessons: { course_id: idCourses, resource: false } },
  });
  let amountLevels = 0;
  resultData.map((game) => {
    amountLevels += game?.gameLevels || 10;
  });
  var data = resultData?.filter((arr, index, self) => index === self.findIndex((t) => t.id === arr.id));
  return { amount: amountLevels, ids: data.map((collec) => collec.id) };
};

module.exports = createCoreService('api::courses.course', ({ strapi }) => ({
  async getEvaluationsAndTasks(ctx) {
    const { course } = ctx;
    const lessonData = await strapi.db.query('api::lessons.lesson').findMany({
      where: { course_id: course, resource: false },
    });
    const lessonDataResource = await strapi.db.query('api::lessons.lesson').findMany({
      where: { course_id: course, resource: true },
    });
    const lessonsId = lessonData.map(lesson => lesson.id);
    const evaluations = await getAmountEvaluationsTasks(course, 'api::evaluations.evaluation', lessonsId);
    const tasks = await getAmountEvaluationsTasks(course, 'api::tasks.task', lessonsId);
    const games = await getAmountGames(course, 'api::games.game');
    return {
      evaluations: evaluations,
      tasks: tasks,
      games: { amount: games.amount, ids: games.ids },
      lessons: { amount: lessonData.length },
      lessonsResource: { amount: lessonDataResource.length },
    };
  },
  async getCourse(ctx) {
    const { slug, courseActive, lessonActive, resource, isTemplate } = ctx;
    const courseFound = await strapi.db.query('api::courses.course').findOne({
      where: { slug: slug, active: courseActive },
      populate: {
        cover: true,
        course_template: {
          select: ['id'],
        },
      },
    });
    const coursesId = [courseFound?.id];
    if (isTemplate && courseFound?.course_template) {
      coursesId.push(courseFound?.course_template?.id);
    }

    courseFound.lessons = await strapi.db.query('api::lessons.lesson').findMany({
      select: ['id', 'title', 'description', 'slug', 'order', 'active'],
      where: { course_id: coursesId, active: lessonActive, resource: resource },
      orderBy: { order: 'asc' },
    });

    courseFound.course_features = await strapi.db.query('api::course-features.course-feature').findMany({
      select: ['id', 'title', 'description', 'icon'],
      where: { course_id: coursesId, active: true },
      orderBy: { order: 'asc' },
    });
    return courseFound;
  },
}));
