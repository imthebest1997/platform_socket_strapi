'use strict';

const { isEmpty, omit } = require('lodash');
const { zonedTimeToUtc } = require('date-fns-tz');

/**
 * score-extra service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::score-extra.score-extra', ({ strapi }) => ({
  async updateWithMoreScore(ctx) {
    let { moreData, geo, cohort } = ctx;
    moreData.id = moreData?.id ? moreData.id : null;
    let result = await strapi.db.query('api::score-extra.score-extra').findOne({
      where: { $or: [{ id: moreData?.id }, { title: moreData.title, cohort: cohort }] },
    });
    moreData = omit(moreData, ['id']);
    if (!isEmpty(result)) {
      const id = result.id;
      moreData.finished_date = zonedTimeToUtc(moreData.finished_date, geo?.timezone);
      await strapi.db.query('api::score-extra.score-extra').update({ where: { id: id }, data: moreData });
    } else {
      moreData.finished_date = zonedTimeToUtc(moreData.finished_date, geo?.timezone);
      moreData.cohort = cohort;
      await strapi.db.query('api::score-extra.score-extra').create({ data: moreData });
    }
  },
}));
