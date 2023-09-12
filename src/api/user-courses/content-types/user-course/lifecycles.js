'use strict';

const { isEmpty } = require('lodash');

const { ForbiddenError } = require('@strapi/utils').errors;

/**
 * Lifecycle callbacks for the `user-courses` model.
 */

const validatingConstraints = (data) => {
  strapi.log.debug(
    `validating data for user courses, data: {user: ${data.user_id}, course: ${data.course_id} and cohort: ${data.cohort_id}} before create`
  );
  const { expiration_date, user_id, course_id } = data;
  data.active = true;
  if (!expiration_date) {
    throw new ForbiddenError('Un registro de curso de usuario, deberá tener una fecha de expiración');
  }
  if (user_id.connect) {
    if (isEmpty(user_id.connect)) {
      throw new ForbiddenError('Un registro de curso de usuario, deberá tener un usuario asignado');
    }
    if (isEmpty(course_id.connect)) {
      throw new ForbiddenError('Un registro de curso de usuario, deberá tener un curso asignado');
    }
  }
};

const createUserProgress = async (data) => {
  const result = await strapi.db.query('api::user-courses.user-course').findOne({
    where: { id: data.id },
    populate: { user_id: { select: ['id'] }, course_id: { select: ['id'] }, cohort_id: { select: ['id'] } },
  });
  const { user_id, course_id, cohort_id } = result;
  let cohort = null;
  if (cohort_id) {
    cohort = cohort_id.id;
  }
  await strapi
    .service('api::users-progress.user-progress')
    .create({ user: user_id?.id, course: course_id?.id, cohort: cohort });
};

const verifyCourseDeleted = (data)=>{
  if(data?.course_id?.disconnect[0]){
    throw new ForbiddenError('No se puede eliminar un curso asociado.');
  }
};

module.exports = {
  async beforeCreate(event) {
    let { data } = event.params;
    validatingConstraints(data);
  },
  async afterCreate(event) {
    const { result } = event;
    createUserProgress(result);
  },
  async beforeUpdate(event){
    let { data } = event.params;
    verifyCourseDeleted(data);
  },
  async afterUpdate(event) {
    const { result } = event;
    createUserProgress(result);
  },
};
