'use strict';
const { isEmpty } = require('lodash');

/**
 * Lifecycle callbacks for the `book-codes` model.
 */
const addPermissionsCourse = async (user_id, course_id, currentDate) => {
  await strapi.service('api::user-courses.user-course').create({
    data: {
      user_id: user_id,
      course_id: course_id,
      expiration_date: new Date(currentDate.setMonth(currentDate.getMonth() + 11)),
    },
  });
};
const deletePermissionsCourse = async (user_id, course_id) => {
  const deletePermissions = await strapi.db.query('api::user-courses.user-course').findMany({
    where: { user_id: user_id, course_id: course_id, cohort_id: null },
  });
  for (const userCourse of deletePermissions) {
    await strapi.db.query('api::user-courses.user-course').update({
      where: { id: userCourse.id },
      data: { active: false },
    });
  }
};

const registerWithCohort = async (params, activated_by) => {
  const { disconnect, connect } = activated_by;
  const currentDate = new Date();
  const userId = activated_by.connect ? connect.map((user) => user.id) : activated_by;
  strapi.log.debug(`Register data:{ userId: ${userId}, course software }, with book code id=${params.id} after create`);

  if (userId) {
    await addPermissionsCourse(userId, 15, currentDate);
  }
  if (!isEmpty(disconnect)) {
    await deletePermissionsCourse(disconnect[0].id, 15);
  }
};

const registerUserCourses = async (params, activated_by, bookCodes) => {
  const { disconnect, connect } = activated_by;
  const userId = activated_by.connect ? connect.map((user) => user.id) : activated_by;
  const slug = await strapi.service('api::book-codes.book-code').getSlugCourse({ grade: bookCodes.grade });
  const currentDate = new Date();
  strapi.log.debug(
    `Register data:{userId: ${userId}, courseSlug: ${slug} and course software} with book code id=${params.id} after create`
  );
  const course = await strapi.db.query('api::courses.course').findOne({
    where: { slug: slug },
  });
  const courseRegisters = [course.id, 15];
  for (const courseRegister of courseRegisters) {
    if (userId) {
      await addPermissionsCourse(userId, courseRegister, currentDate);
    }
    if (!isEmpty(disconnect)) {
      await deletePermissionsCourse(disconnect[0].id, courseRegister);
    }
  }
};
const registerBookCode = async (params, data) => {
  const { activated_by } = data;
  const { connect } = activated_by;
  const bookCodes = await strapi.db.query('api::book-codes.book-code').findOne({
    where: { id: params.id },
    populate: { activated_by: true, cohort: { populate: { students: true } } },
  });
  const userId = activated_by.connect ? connect[0].id : activated_by;
  if (bookCodes?.cohort) {
    const students = isEmpty(bookCodes.cohort.students) ? [userId] : bookCodes.cohort.students.map((studen) => studen.id);
    if (!isEmpty(bookCodes.cohort.students) && !students.includes(userId)) {
      students.push(userId);
    }
    await strapi
      .service('api::cohorts.cohort')
      .update(bookCodes?.cohort.id, { data: { studentsData: students, active: true, registerUsers: true } });
    await registerWithCohort(params, activated_by);
  } else {
    await registerUserCourses(params, activated_by, bookCodes);
  }
};

module.exports = {
  async beforeUpdate(event) {
    let { data, where } = event.params;
    await registerBookCode(where, data);
  },
};
