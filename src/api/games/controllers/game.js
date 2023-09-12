'use strict';

const { isEmpty } = require('lodash');

/**
 * game controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

const updateCohortReferences = async (courseSlug) => {
  const course = await strapi.db.query('api::courses.course').findOne({
    where: { slug: courseSlug },
  });
  let coursesId = course.id;
  const childrenCourses = await strapi.db.query('api::courses.course').findMany({
    where: { course_template: coursesId },
  });
  if (!isEmpty(childrenCourses)) {
    const childrensId = childrenCourses.map((course) => course.id);
    coursesId = [].concat(coursesId, childrensId);
  }
  const cohorts = await strapi.db.query('api::cohorts.cohort').findMany({
    where: { course: coursesId },
    populate: { course: { select: ['id'] } },
  });
  for (const cohort of cohorts) {
    const { id, course } = cohort;
    await strapi
      .service('api::cohorts.cohort')
      .update(id, { data: { updateReferences: true, isActiveLessons: true, course: course.id } });
  }
};

module.exports = createCoreController('api::games.game', ({ strapi }) => ({
  async findGamesByCourse(ctx) {
    const { courseSlug } = ctx.params;
    const courseFound = await strapi.db.query('api::courses.course').findOne({
      where: { slug: courseSlug },
    });

    const games = await strapi.db.query('api::games.game').findMany({
      where: { lessons: { course_id: courseFound.id }, template: false },
    });
    games.map((game) => {
      game.gameLevels = game?.gameLevels || 10;
    });
    return games;
  },

  async findGamesTemplate() {
    const games = await strapi.db.query('api::games.game').findMany({
      where: { template: true },
      populate: { image: { select: ['url'] } },
    });
    return games;
  },

  async findOne(ctx) {
    const { id } = ctx.params;
    const { courseSlug, template } = ctx.request.query;
    let result = await strapi.db.query('api::games.game').findOne({
      where: { id: id, active: true },
      populate: ['lessons'],
    });

    if (!result) {
      return ctx.notFound('No se encontró el juego solicitada o no se encuentra activa');
    }

    if (courseSlug !== undefined && template == false) {
      let lessonsResult = await strapi.db.query('api::lessons.lesson').findMany({
        where: { course_id: { slug: courseSlug } },
      });
      const lessons = lessonsResult.map((lesson) => lesson.id);
      result.lessons.forEach((lesson) => {
        if (lessons.includes(lesson.id)) lesson.view = true;
      });
    } else {
      result.lessons.forEach((lesson) => {
        lesson.view = true;
      });
    }
    return result;
  },

  async updateLessons(ctx) {
    const { id } = ctx.params;
    const { lesson } = ctx.request.body;
    const result = await strapi.db.query('api::games.game').findOne({
      where: { id: id },
      populate: {
        lessons: { select: ['id'] },
      },
    });
    if (isEmpty(result.lessons)) {
      result.lessons.push({ id: lesson.id });
    } else {
      let addLesson = false;
      for (const lessons of result.lessons) {
        if (lessons.id !== lesson.id) {
          addLesson = true;
          break;
        }
      }
      if (addLesson) {
        result.lessons.push({ id: lesson.id });
      }
    }
    return strapi.db.query('api::games.game').update({
      where: { id: result.id },
      data: { lessons: result.lessons },
    });
  },

  async create(ctx) {
    let dataCreate = ctx.request.body;
    dataCreate.data.user_created = ctx.state.user.id;
    const result = await strapi.service('api::games.game').create(ctx.request.body);
    return result;
  },

  async deleteGameRelationWithCourse(ctx) {
    const { courseSlug } = ctx.params;
    const { game_id } = ctx.request.body;

    const lessonsDelete = await strapi.db.query('api::lessons.lesson').findMany({
      where: { course_id: { slug: courseSlug } },
    });

    const idLessonsDelete = lessonsDelete.map((lesson) => lesson.id);
    const lessonsGames = await strapi
      .service('api::games.game')
      .findOne(game_id, { populate: ['lessons'] });
    const idLessonsGame = lessonsGames.lessons.map((lesson) => lesson.id);
    const lessons = idLessonsGame.filter((lesson) => !idLessonsDelete.includes(lesson));
    await strapi.service('api::games.game').update(game_id, { data: { lessonsId: lessons, update: true, courseSlug } });
    await updateCohortReferences(courseSlug);
    return lessons;
  },
}));
