'use strict';

const { isEmpty } = require('lodash');

/**
 *  lessons controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::lessons.lesson', ({ strapi }) => ({
  async findOne(ctx) {
    strapi.log.debug(
      {
        data: { id: ctx.params.id },
      },
      `find lesson started for id'${ctx.params.id}'`
    );
    const lesson = await strapi.service('api::lessons.lesson').findOne(ctx.params.id);

    if (!lesson) {
      strapi.log.error(`No se encontró ningun registro para la clase: ${ctx.params.id}`);
      return ctx.notFound('No se encontró la clase buscada');
    }

    const resultEvaluations = await strapi.db.query('api::evaluations.evaluation').findMany({
      where: { lessons: lesson.id },
    });
    const resultTasks = await strapi.db.query('api::tasks.task').findMany({
      where: { lessons: lesson.id },
    });
    let evaluations = [];
    let tasks = [];

    if (!isEmpty(resultEvaluations)) {
      evaluations = resultEvaluations.map((evaluation) => {
        return { id: evaluation.id, title: evaluation.title, value: evaluation.id };
      });
    }

    if (!isEmpty(resultTasks)) {
      tasks = resultTasks.map((task) => {
        return { id: task.id, title: task.title, value: task.id };
      });
    }
    lesson.evaluations = evaluations;
    lesson.tasks = tasks;

    return lesson;
  },

  async findByCourseAndLessonSlug(ctx) {
    strapi.log.debug(
      { data: { courseSlug: ctx.params.courseSlug, lessonSlug: ctx.params.lessonSlug } },
      `findByCourseAndLessonSlug started for user: '${ctx.state?.user.email}'`
    );

    let courseFound = await strapi.db.query('api::courses.course').findOne({
      select: ['id'],
      where: { slug: ctx.params.courseSlug, active: true },
      populate: {
        course_template: {
          select: ['id'],
        },
      },
    });

    if (!courseFound) {
      strapi.log.error(`No se encontró ningun registro para el curso: ${ctx.params.courseSlug}`);
      return ctx.notFound('No se encontró el curso buscado', true);
    }

    strapi.log.info(`courseFound ${JSON.stringify(courseFound)}`);

    let courses = courseFound.course_template ? [courseFound.id, courseFound.course_template.id] : [courseFound.id];

    const lessonFound = await strapi.db.query('api::lessons.lesson').findOne({
      select: ['id', 'title', 'description', 'slug', 'order', 'active', 'content'],
      where: { course_id: courses, slug: ctx.params.lessonSlug, active: true },
      populate: {
        course_id: { select: 'id' },
        videos: {
          select: ['dash_url', 'hls_url', 'name', 'id'],
          where: { active: true },
        },
      },
    });

    if (!lessonFound) {
      strapi.log.error(`No se encontró ningun registro para la clase: ${ctx.params.lessonSlug}`);
      return ctx.notFound('No se encontró la clase que busca', true);
    }

    if (lessonFound.resource && ctx.state?.user?.role?.id !== 3) {
      strapi.log.error(`No possee permisos de docencia para la clase: ${ctx.params.lessonSlug}`);
      return ctx.notFound('No tienes permisos, para visualizar la clase que busca', true);
    }

    strapi.log.info(`lessonFound ${JSON.stringify(lessonFound)}`);

    const userCourse = await strapi.db.query('api::user-courses.user-course').findOne({
      select: ['id'],
      where: { user_id: ctx.state.user.id, course_id: courseFound.id, active: true },
    });

    strapi.log.info(`userCourse ${JSON.stringify(userCourse)}`);

    if (userCourse && userCourse.id) {
      strapi.log.info(`User has permission to see lessons ${JSON.stringify(lessonFound)}`);
    } else {
      strapi.log.error(
        { data: { courseSlug: ctx.params.courseSlug, lessonSlug: ctx.params.lessonSlug } },
        `No tiene permiso para ver este curso, user: '${ctx.state?.user.email}'`
      );
      return ctx.forbidden('No tiene permiso para ver este curso');
    }

    return lessonFound;
  },

  async deleteLesson(ctx) {
    let { lessonsId } = ctx.request.body;
    for (const lesson of lessonsId) {
      await strapi.db.query('api::lessons.lesson').update({ where: { id: lesson }, data: { course_id: null } });
    }
    ctx.send({
      message: 'ok',
    });
  },

  async getPermissions(ctx) {
    const { cohort } = ctx.params;
    const { isPermissions, lessonsIds } = ctx.request.body;

    const cohortData = await strapi.service('api::cohorts.cohort').findOne(cohort);
    let active_lessons;
    if (isPermissions) {
      active_lessons = cohortData?.active_lessons ? [].concat(cohortData.active_lessons, lessonsIds) : [lessonsIds];
    } else {
      active_lessons = cohortData.active_lessons.filter((lesson) => !lessonsIds.includes(lesson));
    }
    return strapi
      .service('api::cohorts.cohort')
      .update(cohort, { data: { active_lessons: active_lessons, isActiveLessons: true } });
  },
}));
