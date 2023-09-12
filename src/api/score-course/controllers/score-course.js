'use strict';

const { isEmpty, omit } = require('lodash');
const geoip = require('geoip-lite');

/**
 * score-course controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

const updateMoreScore = async (more_score, geo, cohortAux) => {
  for (var more of more_score) {
    if (!more?.isSendFile) {
      more = omit(more, ['isSendFile', 'index', 'title', 'score']);
    } else {
      await strapi.service('api::score-extra.score-extra').updateWithMoreScore({ moreData: more, geo: geo, cohort: cohortAux });
    }
  }
};

module.exports = createCoreController('api::score-course.score-course', ({ strapi }) => ({
  async findOneWithCohort(ctx) {
    const cohortId = parseInt(ctx.params.cohort);
    strapi.log.debug(
      { reqId: ctx.state.reqId },
      `find score final by cohort: '${cohortId}', by email user: '${ctx.state?.user.email}'`
    );
    return strapi.db.query('api::score-course.score-course').findOne({
      where: { cohort: cohortId },
    });
  },
  /*  async createCoursesScore(ctx) {
    strapi.log.debug(
      { reqId: ctx.state.reqId },
      `Iniciando proceso de crear el registro de notas por cohort, solicitado por:  '${ctx.state?.user.email}'`
    );
    const cohorts = await strapi.db
      .query('api::cohorts.cohort')
      .findMany({ where: { active: true, course: { $not: null } }, populate: { course: { select: ['id'] } } });
    for (const cohort of cohorts) {
      const result = await strapi.db.query('api::score-course.score-course').findOne({ where: { cohort: cohort?.id } });
      if (!result) {
        await strapi.service('api::score-course.score-course').create({
          data: {
            evaluations_score: 3,
            tasks_score: 3,
            lessons_score: 2,
            games_score: 2,
            more_score: [],
            cohort: cohort?.id,
            maximun_score: 10,
            pass_score: 8,
          },
        });
      }
      if (!cohort.references) {
        await strapi
          .service('api::cohorts.cohort')
          .update(cohort?.id, { data: { updateReferences: true, isActiveLessons: true, course: cohort.course.id } });
      }
    }
    ctx.send({
      message: 'Registros creados con éxito',
    });
  }, */
  async update(ctx) {
    let data = ctx.request.body.data;
    const customerIp = ctx.request.ip;
    const geo = geoip.lookup(customerIp);
    //const geo = geoip.lookup('207.97.227.239'); //test geoIp
    const { more_score, cohortAux, id } = data;
    await updateMoreScore(more_score, geo, cohortAux);
    const labels = more_score?.map((more) => more.title);
    const resultData = await strapi.db.query('api::score-extra.score-extra').findMany({
      where: { cohort: cohortAux },
    });
    if (!isEmpty(resultData)) {
      const scoreDelete = resultData.filter((result) => !labels.includes(result.title));
      const scoreDeleteId = scoreDelete?.map((score) => score.id);
      await strapi.service('api::user-score-extra.user-score-extra').deleteWithScoreExtra({ noteId: scoreDeleteId });
    }
    const result = await strapi.service('api::score-course.score-course').update(id, ctx.request.body);
    return result;
  },
}));
