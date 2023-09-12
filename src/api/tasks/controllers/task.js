'use strict';
const { zonedTimeToUtc } = require('date-fns-tz');
const geoip = require('geoip-lite');

/**
 *  task controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::tasks.task', ({ strapi }) => ({
  async find(ctx) {
    strapi.log.debug(
      { user: { id: ctx.state.user.id, email: ctx.state.user.email } },
      `Ingresando a la consulta buscar tareas, petición realizada por el usuario: : '${ctx.state?.user.email}'`
    );
    const tasks = await strapi.db.query('api::tasks.task').findMany();
    return tasks;
  },
  async deleteTaskRelationWithCourse(ctx) {
    const { courseSlug } = ctx.params;
    const { task_id } = ctx.request.body;
    const tasksDelete = await strapi.db.query('api::lessons.lesson').findMany({
      where: { course_id: { slug: courseSlug } },
    });

    const idTasksDelete = tasksDelete.map((lesson) => lesson.id);
    const lessonsTasks = await strapi.service('api::tasks.task').findOne(task_id, { populate: ['lessons'] });
    const idLessonsTasks = lessonsTasks.lessons.map((lesson) => lesson.id);
    const lessons = idLessonsTasks.filter((lesson) => !idTasksDelete.includes(lesson));
    await strapi.service('api::tasks.task').update(task_id, { data: { lessons: lessons } });
    return lessons;
  },
  async findTasksByCourse(ctx) {
    const { courseSlug } = ctx.params;
    const courseFound = await strapi.db.query('api::courses.course').findOne({
      where: { slug: courseSlug },
    });

    const tasks = await strapi.db.query('api::tasks.task').findMany({
      where: { lessons: { course_id: courseFound.id } },
    });

    return tasks;
  },
  async findOne(ctx) {
    const { id } = ctx.params;
    const { courseSlug } = ctx.request.query;
    strapi.log.debug({ user: { id: ctx.state.user.id, email: ctx.state.user.email } }, `FindOne task where id = : '${id}'`);
    let result = await strapi.db.query('api::tasks.task').findOne({
      where: { id: id, active: true },
      populate: ['lessons'],
    });

    if (!result) {
      return ctx.notFound('No se encontró la tarea solicitada o no se encuentra activa');
    }
    const { task_finish_date } = result;
    const now = new Date().toISOString();

    if (now > task_finish_date) {
      result.can_send_task = false;
    } else {
      result.can_send_task = true;
    }

    if (courseSlug !== undefined) {
      let lessonsResult = await strapi.db.query('api::lessons.lesson').findMany({
        where: { course_id: { slug: courseSlug } },
      });
      const lessons = lessonsResult.map((lesson) => lesson.id);
      result.lessons.forEach((lesson) => {
        if (lessons.includes(lesson.id)) lesson.view = true;
      });
    }

    return result;
  },
  async update(ctx) {
    const customerIp = ctx.request.ip;
    const geo = geoip.lookup(customerIp);
    let data = ctx.request.body.data;
    const { task_finish_date, id } = data;
    data.task_finish_date = zonedTimeToUtc(task_finish_date, geo?.timezone);
    const result = await strapi.service('api::tasks.task').update(id, ctx.request.body);
    return result;
  },
  async create(ctx) {
    const customerIp = ctx.request.ip;
    const geo = geoip.lookup(customerIp);
    let dataCreate = ctx.request.body;
    dataCreate.data.user_created = ctx.state.user.id;
    const { task_finish_date } = dataCreate.data;
    dataCreate.data.task_finish_date = zonedTimeToUtc(task_finish_date, geo?.timezone);
    const result = await strapi.service('api::tasks.task').create(ctx.request.body);
    return result;
  },
}));
