'use strict';
/* const { ValidationError } = require('@strapi/utils').errors;
const puppeteer = require('puppeteer');  Delete Puppeteer */

/**
 * score-final-user controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

const zeroPad = (num, places) => String(num).padStart(places, '0');

const codeDate = (today, number) => {
  const codeDate = today.toLocaleString('Es', { day: 'numeric', month: 'numeric', year: 'numeric' });
  const dates = codeDate.split('/');
  return `${dates[2]}${zeroPad(dates[1], 2)}${zeroPad(dates[0], 2)}${zeroPad(number, 5)}`;
};

const returnCode = async (id) => {
  let code;
  const scorefinal = await strapi.db.query('api::score-final-user.score-final-user').findOne({
    where: { id: id },
  });
  const certificatedCode = await strapi.db.query('api::certificate-code.certificate-code').findOne({
    where: { id: 1 },
    populate: { background: ['url', 'ext'] },
  });
  const background = certificatedCode?.background?.url;
  const extension = certificatedCode?.background?.ext;
  if (scorefinal?.certificated_code) {
    code = scorefinal.certificated_code;
  } else {
    const today = new Date();
    const codeNumber = codeDate(today, certificatedCode.number);
    code = `${certificatedCode.code}${codeNumber}`;
    await strapi.db.query('api::certificate-code.certificate-code').update({
      where: { id: 1 },
      data: {
        number: certificatedCode.number + 1,
      },
    });
    await strapi.db.query('api::score-final-user.score-final-user').update({
      where: { id: id },
      data: {
        update: true,
        certificated_code: code,
      },
    });
  }
  return { code: code, background: background, extension: extension };
};

const generateCertificate = async (id, studentName, courseName, teacherName) => {
  const today = new Date();
  const expirationDate = today.toLocaleString('Es', { day: 'numeric', month: 'long', year: 'numeric' });
  let { code, background, extension } = await returnCode(id);
  return { code, background, extension, studentName, courseName, teacherName, expirationDate };
};

module.exports = createCoreController('api::score-final-user.score-final-user', ({ strapi }) => ({
  async findMyFinalScoreByCohort(ctx) {
    strapi.log.debug(
      { reqId: ctx.state.reqId },
      `Iniciando proceso de obtener la nota final del usuario:  '${ctx.state?.user.email}'`
    );
    const { cohort } = ctx.params;
    const userFinalScore = await strapi.db.query('api::score-final-user.score-final-user').findOne({
      where: { cohort: cohort, user: ctx.state?.user?.id },
      populate: {
        user: { select: ['id', 'dni', 'name', 'last_name'] },
        cohort: { select: ['id'], populate: { course: { select: ['name'] } } },
      },
    });
    const percentageScore = await strapi.db.query('api::score-course.score-course').findOne({
      where: { cohort: cohort },
      populate: {
        cohort: {
          select: ['id', 'references'],
          populate: { course: { select: ['id'], populate: { course_template: { select: ['id'] } } } },
        },
      },
    });
    const users = [];
    let userScore = await strapi
      .service('api::score-final-user.score-final-user')
      .update(userFinalScore.id, { data: userFinalScore });
    const finalPercentage = await strapi.service('api::users-progress.user-progress').getPercentajeUser({
      percentage: percentageScore,
      cohort: cohort,
      cohortData: percentageScore.cohort,
      user: userFinalScore.user.id,
    });
    userScore.percentage = finalPercentage.finalPercentage;
    userScore.percentageData = finalPercentage.dataPercentage;
    userScore.percentage = `${userScore.percentage}%`;
    userScore.courseFinalScore = `${userScore.final_score}/${percentageScore.maximun_score}`;
    userScore.evaluationsFinalScore = `${userScore.user_score.evaluationsScore.final_score}/${percentageScore.evaluations_score}`;
    userScore.lessonsFinalScore = `${userScore.user_score.lessonsScore.final_score}/${percentageScore.lessons_score}`;
    userScore.tasksFinalScore = `${userScore.user_score.tasksScore.final_score}/${percentageScore.tasks_score}`;
    userScore.gamesFinalScore = `${userScore.user_score.gamesScore.final_score}/${percentageScore.games_score}`;
    userScore.user = userFinalScore.user;
    users.push(userScore);

    return users;
  },
  async findScoreFinalByCohort(ctx) {
    strapi.log.debug(
      { reqId: ctx.state.reqId },
      `Iniciando proceso de obtener las notas finales del usuarios, solicitado por:  '${ctx.state?.user.email}'`
    );
    const { cohort } = ctx.params;
    const userFinalScore = await strapi.db.query('api::score-final-user.score-final-user').findMany({
      where: { cohort: cohort },
      populate: {
        user: { select: ['id', 'dni', 'name', 'last_name'] },
        cohort: { select: ['id'], populate: { course: { select: ['name'] } } },
      },
    });
    const percentageScore = await strapi.db.query('api::score-course.score-course').findOne({
      where: { cohort: cohort },
      populate: {
        cohort: {
          select: ['id', 'references'],
          populate: { course: { select: ['id'], populate: { course_template: { select: ['id'] } } } },
        },
      },
    });
    const users = [];
    for (const userScore of userFinalScore) {
      let newUser = await strapi.service('api::score-final-user.score-final-user').update(userScore.id, { data: userScore });
      const finalPercentage = await strapi.service('api::users-progress.user-progress').getPercentajeUser({
        percentage: percentageScore,
        cohort: cohort,
        cohortData: percentageScore.cohort,
        user: userScore.user.id,
      });
      newUser.percentage = finalPercentage.finalPercentage;
      newUser.percentageData = finalPercentage.dataPercentage;
      newUser.percentage = `${newUser.percentage}%`;
      newUser.courseFinalScore = `${newUser.final_score}/${percentageScore.maximun_score}`;
      newUser.evaluationsFinalScore = `${newUser.user_score.evaluationsScore.final_score}/${percentageScore.evaluations_score}`;
      newUser.lessonsFinalScore = `${newUser.user_score.lessonsScore.final_score}/${percentageScore.lessons_score}`;
      newUser.tasksFinalScore = `${newUser.user_score.tasksScore.final_score}/${percentageScore.tasks_score}`;
      newUser.gamesFinalScore = `${newUser.user_score.gamesScore.final_score}/${percentageScore.games_score}`;
      newUser.user = userScore.user;
      users.push(newUser);
    }

    return users;
  },
  /*  async createUserScoreFinal(ctx) {
    strapi.log.debug(`Iniciando proceso de crear el registro de notas por cohort, solicitado por:  '${ctx.state?.user.email}'`);
    const now = new Date().toISOString();
    const cohorts = await strapi.db.query('api::cohorts.cohort').findMany({
      where: { active: true, end_date: { $gte: now }, course: { $not: null } },
      populate: { students: { select: ['id'] } },
    });
    for (const cohort of cohorts) {
      for (const users of cohort?.students) {
        try {
          strapi.log.debug(`Iniciando proceso de crear el registro de notas para el usuario: ${users?.id}, cohort: ${cohort.id}`);
          await strapi.service('api::score-final-user.score-final-user').create({ cohort: cohort.id, user: users?.id });
        } catch (err) {
          strapi.log.error(`Se presento un error al registrar el usuario: ${users?.id}, cohort: ${cohort.id}`);
          strapi.log.error(err);
        }
      }
    }
    ctx.send({
      message: 'Registros creados con éxito',
    });
  }, */
  async downloadCertificate(ctx) {
    const { certificate_code, cohortId } = ctx.request.body;
    const userFinalScore = await strapi.db.query('api::score-final-user.score-final-user').findOne({
      where: { $or: [{ certificated_code: certificate_code }, { cohort: cohortId, user: ctx.state.user.id }] },
      populate: {
        cohort: {
          select: ['name'],
          populate: {
            course: { select: ['id', 'name'] },
            teachers: { select: ['name', 'last_name'] },
          },
        },
      },
    });
    const {
      cohort: { teachers, course },
      id,
    } = userFinalScore;
    const teacherName = `${teachers[0].name} ${teachers[0].last_name}`;
    const courseName = course.name;
    const studentName = `${ctx.state.user.name} ${ctx.state.user.last_name}`;
    return generateCertificate(id, studentName, courseName, teacherName);
  },
  async createCertificated(ctx) {
    const { studentName, cohort, id } = ctx.request.body;
    strapi.log.debug(
      { reqId: ctx.state.reqId },
      `Iniciando proceso de crear el certificado al estudiante ${studentName}, solicitado por:  '${ctx.state?.user.email}'`
    );
    const teacherName = `${ctx.state.user.name} ${ctx.state.user.last_name}`;
    const results = await strapi.db.query('api::cohorts.cohort').findOne({
      where: { id: cohort },
      populate: {
        course: { select: ['id', 'name'] },
      },
    });
    const courseName = results.course.name;
    return generateCertificate(id, studentName, courseName, teacherName);
  },
}));
