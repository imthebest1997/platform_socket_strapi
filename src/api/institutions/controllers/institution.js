'use strict';

const { differenceBy } = require('lodash');

/**
 *  institution controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::institutions.institution', () => ({
  async findStudentsByInstitution(ctx) {
    //const { id } = ctx.state.user;
    const cohort = parseInt(ctx.params?.cohort);
    strapi.log.debug(`Find students by institution started for user: '${ctx.state?.user?.email}'`);
    let resultCohort = await strapi.service('api::cohorts.cohort').findOne(cohort, { populate: ['students', 'teachers', 'institution'] });
    let resultInstitutions = await strapi
      .service('api::institutions.institution')
      .findOne(resultCohort?.institution?.id, { populate: ['users'] });
    let result = differenceBy(resultInstitutions.users, resultCohort.students, 'id');
    result = differenceBy(result, resultCohort.teachers, 'id');
    //result = result.filter((user) => user.id != id);
    return result;
  },

  async find(ctx) {
    strapi.log.debug(`Find institution with cohorts relation started for user: '${ctx.state?.user?.email}'`);
    const { rows } = await strapi.db.connection.raw('select * from "institutions" where id IN (select distinct(institution_id) from "cohort_institution_links");');
    return rows;
  },
}));
