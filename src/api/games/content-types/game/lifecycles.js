'use strict';

const { difference, isEmpty } = require('lodash');
const { ForbiddenError } = require('@strapi/utils').errors;

/**
 * Lifecycle callbacks for the `game` model.
 */

const trimParamsValidation = async (data) => {
  data.title = data.title?.trim?.();
  data.content = data?.content?.trim?.();
};

const deleteReferenceCohort = async (params, data) => {
  const { id } = params;
  let lessonsId = [];
  if (data?.lessons?.disconnect) {
    const { lessons } = data;
    lessonsId = lessons?.disconnect.map((lesson) => lesson.id);
  } else {
    const lessons = data?.lessons ? data.lessons : data.lessonsId;
    const previusData = await strapi.service('api::games.game').findOne(id, { populate: ['lessons'] });
    const idPreviusData = previusData?.lessons.map((res) => res.id);
    const lessonsData = difference(idPreviusData, lessons);
    lessonsId = lessonsData;
  }
  if (!isEmpty(lessonsId)) {
    const courses = await strapi.db.query('api::courses.course').findMany({
      where: { lessons: lessonsId },
    });
    let coursesId = courses.map((course) => course.id);
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
      const courseData = await strapi.service('api::courses.course').findOne(course.id, { populate: { course_template: true } });
      const coursesId = courseData.course_template ? [courseData.id, courseData.course_template.id] : [courseData.id];
      let courseDataReferences = await strapi.service('api::courses.course').getEvaluationsAndTasks({ course: coursesId });
      courseDataReferences.games.ids = courseDataReferences.games.ids.filter((id) => id !== params.id);
      courseDataReferences.games.amount = courseDataReferences.games.ids.length * 10;
      await strapi.service('api::cohorts.cohort').update(id, { data: { references: courseDataReferences, active: true } });
    }
  }
};

const addReferenceCohort = async (data) => {
  const { id } = data;
  const lessonsResult = await strapi.db.query('api::games.game').findOne({
    where: { id: id },
    populate: { lessons: { select: ['id'] } },
  });
  const lessonsId = lessonsResult.lessons.map((lesson) => lesson.id);
  const courses = await strapi.db.query('api::courses.course').findMany({
    where: { lessons: lessonsId },
  });
  let coursesId = courses.map((course) => course.id);
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

const createGrantPermissions = async (data) => {
  const { id } = data;
  const gameResult = await strapi.db.query('api::games.game').findOne({
    where: { id: id },
    populate: { lessons: { select: ['id', 'references', 'content'] } },
  });
  let references;
  for (const game of gameResult?.lessons) {
    if (!game?.content?.includes(`<Game id="${id}"/>`)) {
      const content = game?.content + `\n<Game id="${id}"/>`;
      if (!game.references) {
        references = {
          evaluations: [],
          tasks: [],
          games: [id],
        };
      } else {
        references = game.references;
        references.games = [].concat(game.references?.games, id);
      }
      await strapi.service('api::lessons.lesson').update(game?.id, {
        data: {
          content: content,
          references: references,
        },
      });
    }
  }
};

const validateRelationLesson = async (params, data) => {
  const { id } = params;
  if (data?.lessons?.connect) {
    const { lessons } = data;
    await removePermissions(lessons.disconnect, id);
    await grantPermissions(lessons.connect, id);
  } else {
    const { lessonsId } = data;
    const previusData = await strapi.service('api::games.game').findOne(id, { populate: ['lessons'] });
    const idPreviusData = previusData?.lessons.map((res) => res.id);
    await removePermissions(difference(idPreviusData, lessonsId), id);
    await grantPermissions(difference(lessonsId, idPreviusData), id);
    data.lessons = lessonsId;
  }
};

const removePermissions = async (lessons, gameId) => {
  for (const lesson of lessons) {
    const id = lesson?.id ? lesson.id : lesson;
    const lessonsData = await strapi.service('api::lessons.lesson').findOne(id);
    const deleteContent = `\\n<Game id=\\"${gameId}\\"\\/>`;
    const regex = new RegExp(deleteContent, 'g');
    const content = lessonsData.content.replace(regex, '');
    lessonsData.references.games = lessonsData.references?.games?.filter((game) => game !== gameId);
    await strapi.service('api::lessons.lesson').update(id, { data: { content: content, references: lessonsData.references } });
  }
};

const grantPermissions = async (lessons, gameId) => {
  let references;
  for (const lesson of lessons) {
    const id = lesson?.id ? lesson.id : lesson;
    const result = await strapi.service('api::lessons.lesson').findOne(id);
    if (!result?.content?.includes(`<Game id="${gameId}"/>`)) {
      const content = result?.content + `\n<Game id="${gameId}"/>`;
      if (!result.references) {
        references = {
          evaluations: [],
          tasks: [],
          games: [gameId],
        };
      } else {
        references = result.references;
        references.games = [].concat(result.references.games, gameId);
      }
      await strapi.service('api::lessons.lesson').update(id, { data: { content: content, references: references } });
    }
  }
};

module.exports = {
  async beforeCreate(event) {
    let { data } = event.params;
    if (process.env.NODE_ENV !== 'staging') {
      throw new ForbiddenError('La colección de juegos, se encuentra en etapa de pruebas...');
    }
    trimParamsValidation(data);
  },
  async afterCreate(event) {
    const { result } = event;
    await createGrantPermissions(result);
    await addReferenceCohort(result);
  },
  async beforeUpdate(event) {
    let { data, where } = event.params;
    trimParamsValidation(data);
    await validateRelationLesson(where, data);
    await deleteReferenceCohort(where, data);
  },
  async afterUpdate(event) {
    const { result } = event;
    await addReferenceCohort(result);
  },
};
