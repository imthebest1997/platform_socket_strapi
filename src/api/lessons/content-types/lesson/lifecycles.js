'use strict';

const { isEmpty, difference } = require('lodash');
const { ValidationError } = require('@strapi/utils').errors;
/**
 * Lifecycle callbacks for the `lessons` model.
 */

const validationData = async (data) => {
  const { slug, order, course_id, courseId } = data;
  strapi.log.debug({ data }, 'Validation Data for Course: ');
  const idCourse = course_id?.connect ? course_id?.connect[0].id : courseId;
  const slugUsed = await strapi.db.query('api::lessons.lesson').findOne({
    where: { course_id: idCourse, slug: slug },
  });

  const orderUsed = await strapi.db.query('api::lessons.lesson').findOne({
    where: { course_id: idCourse, order: order },
  });
  if (slugUsed) {
    throw new ValidationError(`El slug: ${slug}, ya se encuentra utilizado, por favor ingrese otro valor`);
  }
  if (orderUsed) {
    throw new ValidationError(`El order: ${order}, ya se encuentra registrado, por favor ingresa otro valor.`);
  }
  data.course_id = idCourse;
};

const grantPermissionsEvaluations = async (evaluations, editEvaluations, idLesson) => {
  const grantPermissions = difference(editEvaluations, evaluations);
  for (const evaluation of grantPermissions) {
    const evaluationData = await strapi.service('api::evaluations.evaluation').findOne(evaluation, { populate: ['lessons'] });
    let lessons = [];
    if (!isEmpty(evaluationData?.lessons)) {
      lessons = evaluationData.lessons.map((lesson) => lesson.id);
      if (!lessons.includes(idLesson)) {
        lessons.push(idLesson);
      }
    } else {
      lessons.push(idLesson);
    }
    await strapi.service('api::evaluations.evaluation').update(evaluation, {
      data: {
        lessons: lessons,
        update: true,
      },
    });
  }
};

const grantPermissionsTask = async (tasks, editTasks, idLesson) => {
  const grantPermissions = difference(editTasks, tasks);
  for (const task of grantPermissions) {
    const taskData = await strapi.service('api::tasks.task').findOne(task, { populate: ['lessons'] });
    let lessons = [];
    if (!isEmpty(taskData?.lessons)) {
      lessons = taskData.lessons.map((lesson) => lesson.id);
      if (!lessons.includes(idLesson)) {
        lessons.push(idLesson);
      }
    } else {
      lessons.push(idLesson);
    }
    await strapi.service('api::tasks.task').update(task, { data: { lessons: lessons } });
  }
};

const deleteReferenceCohort = async (params, data) => {
  const { course_id } = data;
  let coursesId = [];
  if (course_id?.disconnect) {
    coursesId = course_id?.disconnect.map((lesson) => lesson.id);
  }
  if (!isEmpty(coursesId)) {
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
      let { id, references } = cohort;
      references.lessons.amount -= 1;
      await strapi.service('api::cohorts.cohort').update(id, { data: { references: references, active: true } });
    }
  }
};

const addReferenceCohort = async (data) => {
  const { id } = data;
  const course = await strapi.db.query('api::courses.course').findOne({
    where: { lessons: id },
  });
  let courseId = course.id;
  const childrenCourses = await strapi.db.query('api::courses.course').findMany({
    where: { course_template: courseId },
  });
  if (!isEmpty(childrenCourses)) {
    const childrensId = childrenCourses.map((course) => course.id);
    courseId = [].concat(courseId, childrensId);
  }
  const cohorts = await strapi.db.query('api::cohorts.cohort').findMany({
    where: { course: courseId },
    populate: { course: { select: ['id'] } },
  });
  for (const cohort of cohorts) {
    const { id, course } = cohort;
    await strapi
      .service('api::cohorts.cohort')
      .update(id, { data: { updateReferences: true, isActiveLessons: true, course: course.id } });
  }
};

const removePermissionsEvaluations = async (evaluations, editEvaluations, idLesson) => {
  const removePermissions = difference(evaluations, editEvaluations);
  for (const evaluation of removePermissions) {
    const evaluationData = await strapi.service('api::evaluations.evaluation').findOne(evaluation, { populate: ['lessons'] });
    const idLessons = evaluationData.lessons.map((lesson) => lesson.id);
    const lessons = idLessons.filter((lesson) => lesson !== idLesson);
    await strapi.service('api::evaluations.evaluation').update(evaluation, {
      data: {
        lessons: lessons,
        update: true,
      },
    });
  }
};

const removePermissionsTasks = async (tasks, editTasks, idLesson) => {
  const removePermissions = difference(tasks, editTasks);
  for (const task of removePermissions) {
    const taskData = await strapi.service('api::tasks.task').findOne(task, { populate: ['lessons'] });
    const idLessons = taskData.lessons?.map((lesson) => lesson.id);
    const lessons = idLessons.filter((lesson) => lesson !== idLesson);
    await strapi.service('api::tasks.task').update(task, { data: { lessons: lessons } });
  }
};

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;
    await validationData(data);
  },
  async afterCreate(event) {
    const { result, params } = event;
    const { evaluations, tasks } = params.data;
    await grantPermissionsEvaluations([], evaluations, result.id);
    await grantPermissionsTask([], tasks, result.id);
    await addReferenceCohort(result);
  },
  async beforeUpdate(event) {
    let { data, where } = event.params;
    await deleteReferenceCohort(where, data);
  },
  async afterUpdate(event) {
    const { result, params } = event;
    const { evaluations, editEvaluations, tasks, editTasks } = params.data;
    await removePermissionsEvaluations(evaluations, editEvaluations, result.id);
    await removePermissionsTasks(tasks, editTasks, result.id);
    await grantPermissionsEvaluations(evaluations, editEvaluations, result.id);
    await grantPermissionsTask(tasks, editTasks, result.id);
    await addReferenceCohort(result);
  },
};
