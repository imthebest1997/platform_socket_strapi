'use strict';

const { isEmpty } = require('lodash');

/**
 * user-score-extra controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

const deleteScoreExtra = async (moreScore, cohort) => {
  const labels = moreScore?.map((more) => more.title);
  const resultData = await strapi.db.query('api::score-extra.score-extra').findMany({
    where: { cohort: cohort },
  });
  if (!isEmpty(resultData)) {
    const scoreDelete = resultData.filter((result) => !labels.includes(result.title));
    const scoreDeleteId = scoreDelete?.map((score) => score.id);
    await strapi.service('api::user-score-extra.user-score-extra').deleteWithScoreExtra({ noteId: scoreDeleteId });
  }
};

const getScoreExtraTitle = async (id) => {
  const resultData = await strapi.db.query('api::score-extra.score-extra').findOne({
    where: { id: id },
  });
  return {
    title: resultData.title,
    extra_finish_date: resultData?.finished_date,
    accepted_files: resultData?.accepted_files,
    file_size_maximun: resultData?.file_size_maximun,
    content: resultData?.content,
    upload_report: resultData?.upload_report,
  };
};

const groupByPdf = (dataFilter) => {
  let idsTest = [];
  let dataFilterUser = [];
  for (let data of dataFilter) {
    if (!idsTest.includes(data.user.dni)) {
      const newArray = { ...data };
      const user = newArray.user;
      delete newArray.user;
      const extraScore = [];
      extraScore.push(newArray);
      dataFilterUser.push({
        user: user,
        extraScore: extraScore,
      });
      idsTest.push(user.dni);
    } else {
      for (let dat of dataFilterUser) {
        if (dat.user.dni === data.user.dni) {
          const newArray = { ...data };
          delete newArray.user;
          dat.extraScore.push(newArray);
        }
      }
    }
  }
  return dataFilterUser;
};

module.exports = createCoreController('api::user-score-extra.user-score-extra', ({ strapi }) => ({
  async findManyWithCohort(ctx) {
    const { cohort } = ctx.params;
    const cohortData = await strapi.db.query('api::cohorts.cohort').findOne({ where: { id: cohort }, populate: ['teachers'] });
    const scoreCourse = await strapi.db.query('api::score-course.score-course').findOne({ where: { cohort: cohort } });
    await deleteScoreExtra(scoreCourse.more_score, cohort);
    const teachers = cohortData.teachers.map((t) => t.id);
    let userExtraNotes = await strapi.db
      .query('api::user-score-extra.user-score-extra')
      .findMany({ where: { cohort }, populate: { file_delivered: true, user: { select: ['id', 'name', 'last_name', 'dni'] } } });
    userExtraNotes = userExtraNotes.filter((u) => !teachers.includes(u.user.id));
    for (let userNote of userExtraNotes) {
      const extraScore = await strapi.service('api::score-extra.score-extra').findOne(userNote.extra_note_id);
      userNote.extraNote = extraScore;
    }
    return groupByPdf(userExtraNotes);
  },
  async findMyUserExtraScore(ctx) {
    const {
      user: { id, email },
    } = ctx.state;
    const { cohort } = ctx.params;
    strapi.log.debug(`Get my score extra where cohort: ${cohort} and user: ${email}`);
    let scoreExtra = await strapi.db.query('api::user-score-extra.user-score-extra').findMany({
      where: { cohort: cohort, user: id },
      populate: { file_delivered: { select: ['url', 'mime', 'ext'] }, user: { select: ['dni', 'name', 'last_name'] } },
    });
    for (const score of scoreExtra) {
      const { title, extra_finish_date, accepted_files, file_size_maximun, content, upload_report } = await getScoreExtraTitle(
        score.extra_note_id
      );
      score.qualified = true;
      if (score?.file_delivered || score?.url || !upload_report) {
        score.qualified = false;
      }
      score.extraNote = { title, content };
      score.extra_finish_date = extra_finish_date;
      score.accepted_files = accepted_files;
      score.file_size_maximun = file_size_maximun;
      score.upload_report = upload_report;
    }
    return scoreExtra;
  },
}));
