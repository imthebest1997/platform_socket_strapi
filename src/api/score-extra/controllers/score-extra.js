'use strict';
const { zonedTimeToUtc } = require('date-fns-tz');
const geoip = require('geoip-lite');
const { isEmpty } = require('lodash');

/**
 * score-extra controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::score-extra.score-extra', ({ strapi }) => ({
  async findManyWithCohort(ctx) {
    const { cohort } = ctx.params;
    // const cohortData = await strapi.db.query('api::cohorts.cohort').findOne({where:{id:cohort},populate:['teachers']});
    // const teachers = cohortData.teachers.map((t)=>t.id);
    return strapi.db.query('api::score-extra.score-extra').findMany({ where: { cohort: cohort } });
  },
  async findOneWithLabel(ctx) {
    const { cohort, label, id } = ctx.query;
    let result = [];
    if (id) {
      result = await strapi.db.query('api::score-extra.score-extra').findOne({
        where: { id: id },
      });
    } else {
      result = await strapi.db.query('api::score-extra.score-extra').findOne({
        where: { cohort: cohort, title: label },
      });
    }
    return result || [];
  },
  async create(ctx) {
    const customerIp = ctx.request.ip;
    const geo = geoip.lookup(customerIp);
    let dataCreate = ctx.request.body;
    const { finished_date } = dataCreate.data;
    dataCreate.data.finished_date = zonedTimeToUtc(finished_date, geo?.timezone);
    const result = await strapi.service('api::score-extra.score-extra').create(ctx.request.body);
    return result;
  },
  async deleteWithTitle(ctx) {
    const { name, cohort } = ctx.request.body;
    const result = await strapi.db.query('api::score-extra.score-extra').findOne({ where: { title: name, cohort: cohort } });
    if (!isEmpty(result)) {
      await strapi.service('api::score-extra.score-extra').delete(result.id);
      const userExtras = await strapi.db
        .query('api::user-score-extra.user-score-extra')
        .findMany({ where: { extra_note_id: result.id } });
      for (let userExtra of userExtras) {
        await strapi.service('api::user-score-extra.user-score-extra').delete(userExtra.id);
      }
    }
    ctx.send({ message: 'Nota extra eliminada' });
  },
}));
