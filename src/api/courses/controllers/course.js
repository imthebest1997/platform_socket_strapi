'use strict';

const { isEmpty } = require('lodash');

/**
 *  courses controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::courses.course', ({ strapi }) => ({
  async findBySlugTeacher(ctx) {
    let isMyCourse = await strapi.db.query('api::user-courses.user-course').findMany({
      where: { course_id: { slug: ctx.params.slug }, user_id: ctx?.state?.user?.id },
    });

    if (isEmpty(isMyCourse)) {
      return ctx.forbidden('No tiene permisos para editar este curso');
    }

    let courseFound = await strapi
      .service('api::courses.course')
      .getCourse({
        slug: ctx.params.slug,
        courseActive: [true],
        lessonActive: [true, false],
        resource: false,
        isTemplate: false,
      });

    if (!courseFound) {
      return ctx.notFound('No se encontró el curso buscado', true);
    }

    strapi.log.info(`courseFound ${JSON.stringify(courseFound)}`);

    return courseFound;
  },

  async findLessonsPermission(ctx) {
    let { cohort } = ctx.query;
    let isContentId = false;
    let cohortData;
    let roleUser = 1;
    if (cohort) {
      cohortData = await strapi.service('api::cohorts.cohort').findOne(cohort, { populate: ['teachers'] });
      if (cohortData.teachers.some((e) => e.id === ctx?.state?.user?.id)) {
        roleUser = 2;
      }
    }
    let courseFound = await strapi
      .service('api::courses.course')
      .getCourse({ slug: ctx.params.slug, courseActive: [true, false], lessonActive: [true], resource: false, isTemplate: true });
    if (!courseFound) {
      return ctx.notFound('No se encontró el curso buscado', true);
    }
    courseFound.isContentId = isContentId;
    courseFound.role = roleUser;

    if (cohortData?.active_lessons) {
      courseFound.lessons.map((lesson) => {
        if (cohortData.active_lessons.includes(lesson.id)) {
          lesson.isPermissions = true;
        } else {
          lesson.isPermissions = false;
        }
      });
    } else {
      courseFound.lessons.map((lesson) => {
        lesson.isPermissions = false;
      });
    }
    return courseFound;
  },

  async findBySlug(ctx) {
    let { userCourseId, cohort, resource } = ctx.query;
    resource = resource === 'true';
    let isContentId = false;
    let cohortData;
    let roleUser = 1;
    if (userCourseId) {
      let isMyCourse = await strapi.db.query('api::user-courses.user-course').findMany({
        where: { course_id: { slug: ctx.params.slug }, user_id: ctx?.state?.user?.id },
      });
      isContentId = isMyCourse.some((code) => code.id === parseInt(userCourseId));
    }
    if (cohort) {
      cohortData = await strapi.service('api::cohorts.cohort').findOne(cohort, { populate: ['teachers'] });
      if (cohortData.teachers.some((e) => e.id === ctx?.state?.user?.id)) {
        roleUser = 2;
      }
    }
    let courseFound = await strapi
      .service('api::courses.course')
      .getCourse({ slug: ctx.params.slug, courseActive: [true], lessonActive: [true], resource: resource, isTemplate: true });

    if (!courseFound) {
      return ctx.notFound('No se encontró el curso buscado', true);
    }
    courseFound.isContentId = isContentId;
    courseFound.role = roleUser;

    if (!isEmpty(cohortData?.active_lessons) && !resource) {
      courseFound.lessons = courseFound.lessons.filter((lesson) => cohortData.active_lessons.includes(lesson.id));
    }

    return courseFound;
  },

  async findResources(ctx) {
    const { slug } = ctx.params;
    let courseFound = await strapi
      .service('api::courses.course')
      .getCourse({ slug: slug, courseActive: [true], lessonActive: [true], resource: true, isTemplate: true });

    if (!courseFound) {
      return ctx.notFound('No se encontró el curso buscado', true);
    }

    strapi.log.info(`courseFound ${JSON.stringify(courseFound)}`);

    return courseFound;
  },
}));
