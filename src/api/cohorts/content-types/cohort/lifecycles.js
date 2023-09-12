'use strict';
const { isEmpty, difference } = require('lodash');
const { ForbiddenError } = require('@strapi/utils').errors;

/**
 * Lifecycle callbacks for the `cohort` model.
 */

const validatingConstraints = (data) => {
  strapi.log.debug(`validating data for Cohort, data: {id: ${data.id}, name: ${data.name}} before create`);
  let { students, course, start_date, end_date, teachers, institution } = data;
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  if (endDate <= startDate) {
    throw new ForbiddenError('El valor del campo end_date, debe ser mayor al campo start_date');
  }

  if (isEmpty(course.connect)) {
    throw new ForbiddenError('Un cohort debe tener un curso asignado');
  }
  if (isEmpty(institution.connect)) {
    throw new ForbiddenError('Un cohort debe tener una institución asignada');
  }
  if (!isEmpty(teachers.connect)) {
    students.connect.forEach((student) => {
      if (teachers.connect.some((teacher) => teacher.id === student.id)) {
        throw new ForbiddenError('Un estudiante no puede ser docente en el mismo Cohort');
      }
    });
  }
};

const validatingUniqueCourse = async (data) => {
  strapi.log.debug(`validating unique course, data: {name: ${data.name}} before create`);
  let { course } = data;
  const courseId = course?.connect[0]?.id;
  if (courseId) {
    const cohortData = await strapi.db.query('api::cohorts.cohort').findOne({
      where: { course: courseId },
      populate: { course: { select: ['id', 'name'] } },
    });
    if (cohortData) {
      throw new ForbiddenError(
        `El curso [id: ${cohortData.course.id}, name: ${cohortData.course.name}], ya se encuentra asociado a un cohort, por favor selecione otro curso`
      );
    }
  } else if (course?.disconnect[0]) {
    throw new ForbiddenError(`El cohort: ${data.name}, debe de tener un curso asociado, por favor seleccione un curso.`);
  }
};

const getReferences = async (data) => {
  const { course } = data;
  const courseId = course?.connect ? course.connect[0].id : course;
  const courseData = await strapi.service('api::courses.course').findOne(courseId, { populate: { course_template: true } });
  const coursesId = courseData.course_template ? [courseData.id, courseData.course_template.id] : [courseData.id];
  const courseDataReferences = await strapi.service('api::courses.course').getEvaluationsAndTasks({ course: coursesId });
  data.references = courseDataReferences;
};

const validateContraintsUpdate = async (params, data) => {
  strapi.log.debug(`validating data for Cohort, data: {id: ${params.id}, name: ${data.name}} before update`);
  const results = await strapi.db.query('api::cohorts.cohort').findOne({
    where: { id: params.id },
    populate: {
      teachers: { select: ['id'] },
      students: { select: ['id'] },
      course: { select: ['id'] },
    },
  });
  const { teachers, students } = data;
  let studentsId = await updateDataArray(results.students, students?.connect);
  let teachersId = await updateDataArray(results.teachers, teachers?.connect);
  studentsId.forEach((student) => {
    if (teachersId.some((teacher) => teacher.id === student.id)) {
      throw new ForbiddenError(`Un estudiante no puede ser docente en el mismo Cohort: ${params.id}`);
    }
  });
};

const registerUsersCourses = async (result) => {
  const dataResult = await strapi.db.query('api::cohorts.cohort').findOne({
    where: { id: result.id },
    populate: {
      teachers: { select: ['id'] },
      students: { select: ['id'] },
      course: { select: ['id'] },
    },
  });
  const { teachers, students, course } = dataResult;
  strapi.log.debug(
    `Register data:{teachers id: [${teachers.map((teacher) => teacher.id)}], students id: [${students.map(
      (teacher) => teacher.id
    )}], course id: ${course.id}} for Cohort, data: {id: ${result.id}, name: ${result.name}} after create`
  );
  for (const teacher of teachers) {
    await createOrUpdateRegister(course.id, teacher.id, result.id, result.end_date);
  }
  for (const student of students) {
    await createOrUpdateRegister(course.id, student.id, result.id, result.end_date);
  }
};

const createFinalScores = async ({ id, students, course }) => {
  await strapi.service('api::score-course.score-course').create({
    data: {
      evaluations_score: 3,
      lessons_score: 3,
      tasks_score: 2,
      games_score: 2,
      more_score: [],
      cohort: id,
      maximun_score: 10,
      pass_score: 8,
    },
  });

  for (const student of students) {
    await createUserProgress(id, course.id, student.id);
    await createUserScore(id, student.id);
  }
};

const createUserScore = async (cohort, student) => {
  await strapi.service('api::score-final-user.score-final-user').create({ cohort: cohort, user: student });
};

const createUserProgress = async (cohort, course_id, user_id) => {
  await strapi.service('api::users-progress.user-progress').create({ user: user_id, course: course_id, cohort: cohort });
};

const deleteUserScore = async (cohort, student) => {
  await strapi.db.query('api::score-final-user.score-final-user').delete({ where: { cohort: cohort, user: student } });
};

const deleteUserProgress = async (cohort, student, course) => {
  await strapi.db.query('api::users-progress.user-progress').delete({
    where: { user: student, cohort: cohort, course: course },
  });
};

const createOrUpdateRegister = async (course_id, user_id, cohort_id, expiration_date) => {
  strapi.log.debug(`Create data:{user: ${user_id}, course: ${course_id}, cohort:${cohort_id}, in collection user-courses`);
  const results = await strapi.db.query('api::user-courses.user-course').findOne({
    where: { user_id: user_id, course_id: course_id, cohort_id: cohort_id },
  });
  if (!results) {
    const courseData = await strapi.service('api::courses.course').findOne(course_id, { populate: ['course_template'] });
    const courseId = courseData.course_template ? courseData.course_template.id : course_id;
    if (!courseData.course_template) {
      await strapi.service('api::user-courses.user-course').create({
        data: {
          course_id: courseId,
          user_id: user_id,
          cohort_id: cohort_id,
          active: true,
          expiration_date: expiration_date,
        },
      });
    } else {
      const resultsTemplate = await strapi.db.query('api::user-courses.user-course').findOne({
        where: { user_id: user_id, course_id: course_id, cohort_id: null },
      });
      await updateCourses(courseId, user_id);
      if (resultsTemplate) {
        await strapi.service('api::user-courses.user-course').update(resultsTemplate.id, {
          data: { course_id: course_id, cohort_id: cohort_id, active: true, expiration_date: expiration_date },
        });
      } else {
        await strapi.service('api::user-courses.user-course').create({
          data: {
            course_id: course_id,
            user_id: user_id,
            cohort_id: cohort_id,
            active: true,
            expiration_date: expiration_date,
          },
        });
      }
    }
  } else {
    const courseData = await strapi.service('api::courses.course').findOne(course_id, { populate: ['course_template'] });
    if (courseData.course_template) {
      await updateCourses(courseData.course_template.id, user_id);
    }
    await strapi
      .service('api::user-courses.user-course')
      .update(results.id, { data: { cohort_id: cohort_id, active: true, expiration_date: expiration_date } });
  }
};

const updateCourses = async (courseId, userId) => {
  const courses = await strapi.db.query('api::user-courses.user-course').findMany({
    where: { user_id: userId, course_id: courseId },
  });
  for (const course of courses) {
    await strapi.service('api::user-courses.user-course').update(course.id, {
      data: {
        active: false,
      },
    });
  }
};

const updatingUsers = async (params, data) => {
  const { studentsData } = data;
  const results = await strapi
    .service('api::cohorts.cohort')
    .findOne(params.id, { populate: { course: { select: ['id'] }, students: { select: ['id'] } } });
  const { students, course, end_date } = results;
  const studentsId = students.map((studen) => studen.id);
  const deleteUsers = difference(studentsId, studentsData);
  await deleteUsersInUserCourses(deleteUsers, params.id, course.id);
  for (const student of studentsData) {
    await createOrUpdate(student, course.id, params.id, end_date);
  }
  for (const student of studentsData) {
    await createUserScore(params.id, student);
  }
  data.students = studentsData;
};

const updateDataArray = async (currentData, newData) => {
  let newArraydata = currentData;
  if (!isEmpty(newData)) {
    newData?.map((person) => {
      newArraydata.push({ id: person.id });
    });
  }
  return newArraydata;
};

const updatingRecord = async (params, data) => {
  const results = await strapi.db.query('api::cohorts.cohort').findOne({
    where: { id: params.id },
    populate: {
      teachers: { select: ['id'] },
      students: { select: ['id'] },
      course: { select: ['id'] },
    },
  });
  const { course } = results;
  const { teachers, students, end_date } = data;
  strapi.log.debug(`Updating data for Cohort, data: {id: ${params.id}, name: ${data.name}} before update`);
  if (data.active) {
    let studentsId = await updateDataArray(results.students, students?.connect);
    let teachersId = await updateDataArray(results.teachers, teachers?.connect);
    for (const teacher of teachersId) {
      await createOrUpdate(teacher.id, course.id, params.id, end_date);
    }
    for (const student of studentsId) {
      await createOrUpdate(student.id, course.id, params.id, end_date);
    }
    for (const student of studentsId) {
      await createUserScore(params.id, student);
    }
    await deleteUsersInUserCourses(
      teachers?.disconnect?.map((teacher) => teacher.id),
      params.id,
      course.id
    );
    await deleteUsersInUserCourses(
      students?.disconnect?.map((student) => student.id),
      params.id,
      course.id
    );
  } else {
    throw new ForbiddenError('El cohort a actualizar, se encuentra desactivado, por ende, los cambios, no se guardarán.');
  }
};

const deleteUsersInUserCourses = async (dataDelete, cohortId, courseId) => {
  strapi.log.debug(`Delete users: {users: ${dataDelete?.map((data) => data)}}, from Cohort: ${cohortId} and course: ${courseId}`);
  dataDelete?.forEach(async (data) => {
    await strapi.db.query('api::user-courses.user-course').delete({
      where: { user_id: data, cohort_id: cohortId, course_id: courseId },
    });
    await deleteUserScore(cohortId, data);
    await deleteUserProgress(cohortId, data, courseId);
  });
};

const createOrUpdate = async (userId, courseId, cohortId, end_date) => {
  strapi.log.debug(`Create or update data:{user: ${userId}, course: ${courseId}, cohort:${cohortId}, in collection user-courses`);
  await createOrUpdateRegister(courseId, userId, cohortId, end_date);
};

const getActiveLessons = async (data) => {
  const id = data?.course?.connect[0]?.id || data.course_id;
  const courseFound = await strapi.db.query('api::courses.course').findOne({
    where: { id: id, active: true },
    populate: {
      cover: true,
      course_template: {
        select: ['id'],
      },
    },
  });
  const coursesId = [courseFound?.id];
  if (courseFound?.course_template) {
    coursesId.push(courseFound?.course_template?.id);
  }
  const lessons = await strapi.db.query('api::lessons.lesson').findMany({
    select: ['id', 'title', 'description', 'slug', 'order', 'active'],
    where: { course_id: coursesId, active: true, resource: false },
    orderBy: { order: 'asc' },
  });

  data.active_lessons = lessons.map((l) => l.id);
};

module.exports = {
  async beforeCreate(event) {
    let { data } = event.params;
    validatingConstraints(data);
    await validatingUniqueCourse(data);
    await getReferences(data);
    await getActiveLessons(data);
  },
  async afterCreate(event) {
    const { result } = event;
    await registerUsersCourses(result);
    await createFinalScores(result);
  },
  async beforeUpdate(event) {
    let { data, where } = event.params;
    if (data?.updateReferences) {
      await getReferences(data);
    }
    if (data?.updatePermission) {
      await getActiveLessons(data);
    }
    if (!data?.isActiveLessons) {
      if (data.registerUsers) {
        await updatingUsers(where, data);
      } else {
        await validatingUniqueCourse(data);
        await validateContraintsUpdate(where, data);
        await updatingRecord(where, data);
      }
    }
  },
};
