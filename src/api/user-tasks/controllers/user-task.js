'use strict';

/**
 *  user-task controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

const getTasksScore = async (courseFound) => {
  let lessonsIds = courseFound.lessons.map((c) => c.id);
  let tasks = await strapi.db.query('api::tasks.task').findMany({ where: { lessons: lessonsIds } });
  var translation = ['Dni', 'Usuario'];
  var names = ['Dni', 'Usuario'];
  tasks.map((e) => {
    translation.push(`${e.title}. (10)`);
    names.push(e.title);
  });
  names.push('NotaFinal');
  translation.push('Nota Final');
  return { names: names, translation: translation };
};

module.exports = createCoreController('api::user-tasks.user-task', ({ strapi }) => ({
  async findUserTaskWithCourseSlug(ctx) {
    const { courseSlug } = ctx.params;
    let { cohort_id } = ctx.query;
    cohort_id = cohort_id ? cohort_id : null;
    strapi.log.debug(`find user tasks with course ${courseSlug} and cohort: ${cohort_id}`);
    let resultCohort = [];
    if (cohort_id) {
      resultCohort = await strapi.db.query('api::cohorts.cohort').findOne({ where: { id: cohort_id }, populate: ['teachers'] });
      resultCohort = resultCohort?.teachers?.map((teacher) => teacher.id);
    }
    let userTasks = await strapi.db.query('api::user-tasks.user-task').findMany({
      where: { course: { slug: courseSlug }, cohort: cohort_id },
      populate: ['course', 'user', 'file_delivered'],
    });
    let courseFound = await strapi
      .service('api::courses.course')
      .getCourse({ slug: courseSlug, courseActive: [true], lessonActive: [true], resource: false, isTemplate: true });
    const tasksResult = await getTasksScore(courseFound);

    for (let userTask of userTasks) {
      const task = await strapi.service('api::tasks.task').findOne(userTask.task_id);
      userTask.task = task;
    }

    let userTasksActive = [];

    for (let userTask of userTasks) {
      const userCourse = await strapi.db.query('api::user-courses.user-course').findOne({
        where: { course_id: userTask.course.id, user_id: userTask.user.id, cohort_id: cohort_id },
      });
      if (userCourse?.active && !resultCohort.includes(userTask.user.id)) {
        userTask.headers = tasksResult.names;
        userTask.translation = tasksResult.translation;
        userTasksActive.push(userTask);
      }
    }

    return userTasksActive;
  },
  async findMyTaskWithCourseSlug(ctx) {
    const { courseSlug } = ctx.params;
    let { cohort_id } = ctx.query;
    cohort_id = cohort_id ? cohort_id : null;
    strapi.log.debug(`find user tasks with course ${courseSlug} cohort: ${cohort_id}, and user: ${ctx.state.user.id}`);
    let userTasks = await strapi.db.query('api::user-tasks.user-task').findMany({
      where: { course: { slug: courseSlug }, cohort: cohort_id, user: ctx.state.user.id },
      populate: ['course', 'user', 'file_delivered'],
    });
    let courseFound = await strapi
      .service('api::courses.course')
      .getCourse({ slug: courseSlug, courseActive: [true], lessonActive: [true], resource: false, isTemplate: true });
    const tasksResult = await getTasksScore(courseFound);

    for (let userTask of userTasks) {
      const task = await strapi.service('api::tasks.task').findOne(userTask.task_id);
      userTask.task = task;
    }

    let userTasksActive = [];

    for (let userTask of userTasks) {
      userTask.headers = tasksResult.names;
      userTask.translation = tasksResult.translation;
      userTasksActive.push(userTask);
    }

    return userTasksActive;
  },
  async findOne(ctx) {
    strapi.log.debug(`find task for user-task ${ctx.state.user.email}`);
    let { lesson, courseSlug, cohort, task_id } = ctx.query;
    cohort = cohort ? cohort : null;
    const result = await strapi.db.query('api::user-tasks.user-task').findOne({
      where: {
        task_id: task_id,
        lesson: lesson,
        course: { slug: courseSlug },
        user: ctx.state.user.id,
        cohort: cohort,
      },
      populate: ['file_delivered'],
    });

    if (!result) {
      return { file_delivered: [] };
    }
    return result;
  },
  async findOneOrCreate(ctx) {
    let { file_delivered, id, lesson, courseSlug, cohort, url } = ctx.request.body.data;
    cohort = cohort ? cohort : null;
    let result = await strapi.db.query('api::user-tasks.user-task').findOne({
      where: { task_id: id, lesson: lesson, course: { slug: courseSlug }, user: ctx.state.user.id, cohort: cohort },
      populate: ['file_delivered'],
    });
    if (!result) {
      const course = await strapi.db.query('api::courses.course').findOne({
        where: { slug: courseSlug },
      });
      result = await strapi.service('api::user-tasks.user-task').create({
        data: {
          qualified: false,
          score: 1,
          presentation_time: new Date(),
          user: ctx.state.user.id,
          lesson: lesson,
          course: course?.id,
          task_id: id,
          cohort: cohort,
          file_delivered: file_delivered,
        },
        populate: ['file_delivered'],
      });
    } else {
      await strapi.service('api::user-tasks.user-task').update(result.id, {
        data: {
          presentation_time: new Date(),
          file_delivered: file_delivered,
          url: url,
          role: ctx.state.user.role?.id,
        },
      });
    }
    return result;
  },
}));
