'use strict';

/**
 *  user-evaluation controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

const getEvaluationsScore = async (courseFound) => {
  let lessonsIds = courseFound.lessons.map((c) => c.id);
  let evaluations = await strapi.db.query('api::evaluations.evaluation').findMany({ where: { lessons: lessonsIds } });
  var scoreFinalEvaluations = 0;
  var translation = ['Dni', 'Usuario'];
  var names = ['Dni', 'Usuario'];
  evaluations.map((e) => {
    scoreFinalEvaluations += e.score;
    translation.push(`${e.title}. (${e.score})`);
    names.push(e.title);
  });
  names.push('NotaFinal');
  translation.push('Nota Final');
  scoreFinalEvaluations = scoreFinalEvaluations / evaluations.length;
  return { score: scoreFinalEvaluations, names: names, translation: translation };
};

module.exports = createCoreController('api::user-evaluations.user-evaluation', ({ strapi }) => ({
  async findUserEvaluationWithCourseSlug(ctx) {
    const { courseSlug } = ctx.params;
    let { cohort_id } = ctx.query;
    cohort_id = cohort_id ? cohort_id : null;
    strapi.log.debug(`find user evaluations with course ${courseSlug} and cohort: ${cohort_id}`);
    let resultCohort = [];
    if (cohort_id) {
      resultCohort = await strapi.db.query('api::cohorts.cohort').findOne({ where: { id: cohort_id }, populate: ['teachers'] });
      resultCohort = resultCohort?.teachers?.map((teacher) => teacher.id);
    }
    let userEvaluations = await strapi.db.query('api::user-evaluations.user-evaluation').findMany({
      where: { course: { slug: courseSlug }, cohort_id: cohort_id },
      orderBy: { score_obtained: 'DESC  ' },
      populate: ['course', 'user_id'],
    });
    let courseFound = await strapi
      .service('api::courses.course')
      .getCourse({ slug: courseSlug, courseActive: [true], lessonActive: [true], resource: false, isTemplate: true });
    const evaluationsResult = await getEvaluationsScore(courseFound);
    for (let userEvaluation of userEvaluations) {
      const evaluation = await strapi
        .service('api::evaluations.evaluation')
        .findOne(userEvaluation.evaluation_id, { populate: ['questions', 'questions.options'] });
      userEvaluation.evaluation = evaluation;
    }
    let userEvaluationsActive = [];

    for (let userEvaluation of userEvaluations) {
      const userCourse = await strapi.db.query('api::user-courses.user-course').findOne({
        where: { course_id: userEvaluation.course.id, user_id: userEvaluation.user_id.id, cohort_id: cohort_id },
      });
      if (userCourse?.active && !resultCohort.includes(userEvaluation.user_id.id)) {
        userEvaluation.score_average = evaluationsResult.score;
        userEvaluation.headers = evaluationsResult.names;
        userEvaluation.translation = evaluationsResult.translation;
        userEvaluationsActive.push(userEvaluation);
      }
    }
    return userEvaluationsActive;
  },
  async findMyEvaluationsWithCourseSlug(ctx) {
    const { courseSlug } = ctx.params;
    let { cohort_id } = ctx.query;
    cohort_id = cohort_id ? cohort_id : null;
    strapi.log.debug(`find user evaluations with course ${courseSlug}, cohort: ${cohort_id} and user: ${ctx.state.user.id}`);
    let userEvaluations = await strapi.db.query('api::user-evaluations.user-evaluation').findMany({
      where: { course: { slug: courseSlug }, cohort_id: cohort_id, user_id: ctx.state.user.id },
      orderBy: { score_obtained: 'DESC  ' },
      populate: ['course', 'user_id'],
    });
    let courseFound = await strapi
      .service('api::courses.course')
      .getCourse({ slug: courseSlug, courseActive: [true], lessonActive: [true], resource: false, isTemplate: true });
    const evaluationsResult = await getEvaluationsScore(courseFound);
    for (let userEvaluation of userEvaluations) {
      const evaluation = await strapi
        .service('api::evaluations.evaluation')
        .findOne(userEvaluation.evaluation_id, { populate: ['questions', 'questions.options'] });
      userEvaluation.evaluation = evaluation;
    }
    let userEvaluationsActive = [];

    for (let userEvaluation of userEvaluations) {
      userEvaluation.score_average = evaluationsResult.score;
      userEvaluation.evaluation_result.map((evaluion) => (evaluion.optionSelected = []));
      userEvaluation.headers = evaluationsResult.names;
      userEvaluation.translation = evaluationsResult.translation;
      userEvaluationsActive.push(userEvaluation);
    }
    return userEvaluationsActive;
  },

  async findByEvaluation(ctx) {
    strapi.log.debug('findByEvaluation for user-evaluation started');
    let { evaluation_id, courseSlug, lesson_id, cohort_id } = ctx.query;
    cohort_id = cohort_id ? cohort_id : null;

    const evaluationResult = await strapi.db.query('api::user-evaluations.user-evaluation').findOne({
      where: {
        evaluation_id: evaluation_id,
        user_id: ctx.state.user.id,
        lesson: lesson_id,
        course: { slug: courseSlug },
        cohort_id: cohort_id,
      },
    });

    if (!evaluationResult) {
      strapi.log.error(
        `No se encontró un registro para el usuario: ${ctx.state.user.email}, con la evaluación: ${evaluation_id}`
      );
      return false;
    }
    strapi.log.debug(
      `result of the consult: [ id: ${evaluationResult.id}, scoreObtained: ${evaluationResult.score_obtained}, evaluation_id: ${evaluationResult.evaluation_id}, user_email: ${ctx.state.user.email} ]`
    );
    evaluationResult.takeExam = true;

    const evaluation = await strapi.service('api::evaluations.evaluation').findOne(evaluationResult.evaluation_id);
    if (evaluationResult.evaluation_result.length >= evaluation.attempts) {
      evaluationResult.takeExam = false;
    }
    evaluationResult.evaluation_result.map((evaluation, index) => {
      evaluation.index = index + 1;
      evaluation.close_confirmation = evaluation?.close_confirmation || 'Ninguna';
    });
    return evaluationResult;
  },
}));
