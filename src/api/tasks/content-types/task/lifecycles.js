'use strict';

const { difference, isEmpty } = require('lodash');

/**
 * Lifecycle callbacks for the `task` model.
 */

const trimParamsValidation = async (data) => {
  // Trim all the params after verifying there are present
  data.title = data.title?.trim?.();
  data.accepted_files = data?.accepted_files?.trim?.();
  data.content = data?.content?.trim?.();
};

const deleteReferenceCohort = async (params, data) => {
  const { id } = params;
  const { lessons } = data;
  let lessonsId = [];
  if (lessons?.disconnect) {
    lessonsId = lessons?.disconnect.map((lesson) => lesson.id);
  } else {
    const previusData = await strapi.service('api::tasks.task').findOne(id, { populate: ['lessons'] });
    const idPreviusData = previusData?.lessons.map((res) => res.id);
    const lessonsData = difference(idPreviusData, lessons);
    lessonsId = lessonsData?.map((lesson) => lesson.id);
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
      courseDataReferences.tasks.ids = courseDataReferences.tasks.ids.filter((id) => id !== params.id);
      courseDataReferences.tasks.amount = courseDataReferences.tasks.ids.length;
      await strapi.service('api::cohorts.cohort').update(id, { data: { references: courseDataReferences, active: true } });
    }
  }
};

const addReferenceCohort = async (data) => {
  const { id } = data;
  const lessonsResult = await strapi.db.query('api::tasks.task').findOne({
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
  const lessonsResult = await strapi.db.query('api::tasks.task').findOne({
    where: { id: id },
    populate: { lessons: { select: ['id', 'references', 'content'] } },
  });
  let references;
  for (const lesson of lessonsResult?.lessons) {
    if (!lesson?.content?.includes(`<Task id="${id}"/>`)) {
      const content = lesson?.content + `\n<Task id="${id}"/>`;
      if (!lesson.references) {
        references = {
          evaluations: [],
          tasks: [id],
        };
      } else {
        references = lesson.references;
        references.tasks = [].concat(lesson.references.tasks, id);
      }
      await strapi.service('api::lessons.lesson').update(lesson?.id, {
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
  const { lessons } = data;
  if (lessons?.connect) {
    await removePermissions(lessons.disconnect, id);
    await grantPermissions(lessons.connect, id);
  } else {
    const previusData = await strapi.service('api::tasks.task').findOne(id, { populate: ['lessons'] });
    const idPreviusData = previusData?.lessons.map((res) => res.id);
    await removePermissions(difference(idPreviusData, lessons), id);
    await grantPermissions(difference(lessons, idPreviusData), id);
  }
};

const removePermissions = async (lessons, taskId) => {
  for (const lesson of lessons) {
    const id = lesson?.id ? lesson.id : lesson;
    const lessonsData = await strapi.service('api::lessons.lesson').findOne(id);
    const deleteContent = `\\n<Task id=\\"${taskId}\\"\\/>`;
    const regex = new RegExp(deleteContent, 'g');
    const content = lessonsData.content.replace(regex, '');
    lessonsData.references.tasks = lessonsData.references.tasks.filter((task) => task !== taskId);
    await strapi.service('api::lessons.lesson').update(id, { data: { content: content, references: lessonsData.references } });
  }
};

const grantPermissions = async (lessons, taskId) => {
  let references;
  for (const lesson of lessons) {
    const id = lesson?.id ? lesson.id : lesson;
    const result = await strapi.service('api::lessons.lesson').findOne(id);
    if (!result?.content?.includes(`<Task id="${taskId}"/>`)) {
      const content = result?.content + `\n<Task id="${taskId}"/>`;
      if (!result.references) {
        references = {
          evaluations: [],
          tasks: [taskId],
        };
      } else {
        references = result.references;
        references.tasks = [].concat(result.references.tasks, taskId);
      }
      await strapi.service('api::lessons.lesson').update(id, { data: { content: content, references: references } });
    }
  }
};

module.exports = {
  async beforeCreate(event) {
    let { data } = event.params;
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
