'use strict';
const { ForbiddenError } = require('@strapi/utils').errors;
/**
 * Lifecycle callbacks for the `user-task` model.
 */

const updateUserTask = async (params, data) => {
  const id = parseInt(params.id);
  const role = data?.role || 2;
  const userTaskData = await strapi.service('api::user-tasks.user-task').findOne(id);
  const taskData = await strapi.service('api::tasks.task').findOne(userTaskData.task_id);
  const { task_finish_date } = taskData;
  const now = new Date().toISOString();
  if (role !== 3 && now > task_finish_date) {
    throw new ForbiddenError('El tiempo estipulado para la entrega de la tarea, ha caducado');
  } else if (role !== 3 && userTaskData?.qualified) {
    throw new ForbiddenError('La tarea ya se encuentra calificada, no se aceptan modificaciones');
  }
};

const finishedTask = async (params) => {
  const result = await strapi.db.query('api::user-tasks.user-task').findOne({
    where: { id: params.id },
    populate: {
      cohort: { select: ['id'] },
      user: { select: ['id'] },
      course: { select: ['id'] },
    },
  });
  const { cohort, user, course } = result;
  const userProgress = await strapi.db.query('api::users-progress.user-progress').findOne({
    where: { course: course?.id, user: user?.id, cohort: cohort?.id },
  });
  let { id, general_data } = userProgress;
  general_data.tasks[0] = general_data.tasks[0] + 1;
  await strapi.db.query('api::users-progress.user-progress').update({ where: { id: id }, data: { general_data: general_data } });
};

module.exports = {
  async afterCreate(event) {
    const { result } = event;
    await finishedTask(result);
  },
  async beforeUpdate(event) {
    let { data, where } = event.params;
    if (!data.migrate) {
      await updateUserTask(where, data);
    }
  },
};
