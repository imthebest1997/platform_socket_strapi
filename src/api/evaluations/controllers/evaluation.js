'use strict';
const { zonedTimeToUtc } = require('date-fns-tz');
const geoip = require('geoip-lite');
/**
 *  evaluations controller -> falta findOne, create and findMyEvaluations
 */
const fisherYatesShuffle = (arr) => {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::evaluations.evaluation', ({ strapi }) => ({
  async find(ctx) {
    strapi.log.debug(
      `Ingresando a la consulta buscar evaluaciones, petición realizada por el usuario: '${ctx.state?.user.email}'`
    );
    const { courseSlug } = ctx.params;
    const slug = courseSlug.split('-')[0];
    const courseFound = await strapi.db.query('api::courses.course').findMany({
      where: { slug: { $contains: slug } },
    });
    const idCourses = courseFound?.map((course) => course.id);

    const evaluations = await strapi.db.query('api::evaluations.evaluation').findMany({
      where: { $or: [{ lessons: null }, { lessons: { course_id: idCourses } }] },
    });

    const evaluationsFoundToLog = evaluations?.map(({ id, title, content }) => {
      return { id, title, content };
    });

    strapi.log.debug({ evaluationsFoundToLog }, 'Evaluaciones encontradas:');
    return evaluations;
  },
  async findSelectExportEvaluation(ctx) {
    const { courseSlug } = ctx.params;
    const slug = courseSlug.split('-')[0];
    const courseFound = await strapi.db.query('api::courses.course').findMany({
      where: { slug: { $contains: slug } },
    });
    const idCourses = courseFound?.map((course) => course.id);

    const evaluations = await strapi.db.query('api::evaluations.evaluation').findMany({
      where: { lessons: { course_id: idCourses } },
    });

    return evaluations;
  },
  async findResourceEvaluationsByCourse(ctx) {
    const { courseSlug } = ctx.params;
    const courseFound = await strapi.db.query('api::courses.course').findOne({
      where: { slug: courseSlug },
      populate: {
        course_template: {
          select: ['id'],
        },
      },
    });

    let coursesId = [courseFound.id];

    if (courseFound?.course_template) {
      coursesId.push(courseFound.course_template.id);
    }

    const evaluations = await strapi.db.query('api::evaluations.evaluation').findMany({
      where: { lessons: { course_id: coursesId } },
      populate: ['questions', 'questions.options'],
    });
    return evaluations;
  },

  async findEvaluationsByCourse(ctx) {
    const { courseSlug } = ctx.params;
    const courseFound = await strapi.db.query('api::courses.course').findOne({
      where: { slug: courseSlug },
    });

    const evaluations = await strapi.db.query('api::evaluations.evaluation').findMany({
      where: { lessons: { course_id: courseFound.id } },
    });

    return evaluations;
  },
  async deleteEvaluationrelationWithCourse(ctx) {
    const { courseSlug } = ctx.params;
    const { evaluation_id } = ctx.request.body;
    const lessonsDelete = await strapi.db.query('api::lessons.lesson').findMany({
      where: { course_id: { slug: courseSlug } },
    });

    const idLessonsDelete = lessonsDelete.map((lesson) => lesson.id);
    const lessonsEvaluation = await strapi
      .service('api::evaluations.evaluation')
      .findOne(evaluation_id, { populate: ['lessons'] });
    const idLessonsEvaluation = lessonsEvaluation.lessons.map((lesson) => lesson.id);
    const lessons = idLessonsEvaluation.filter((lesson) => !idLessonsDelete.includes(lesson));
    await strapi.service('api::evaluations.evaluation').update(evaluation_id, { data: { lessons: lessons, update: true } });
    return lessons;
  },
  async scoreTest(ctx) {
    const { options, courseSlug, lesson_id, cohort_id } = ctx.request.body;
    const { evaluation_id, optionSelect, message, timeLeft, timePresent } = options;
    const { state } = ctx;

    const evaluation = await strapi
      .service('api::evaluations.evaluation')
      .findOne(evaluation_id, { populate: ['questions', 'questions.options'] });

    strapi.log.debug(
      { optionSelect: { data: optionSelect } },
      `Ingreso Proceso de Calificación al usuario: '${state?.user.email}'`
    );
    let orderOptionSelect = [];
    for (const question of evaluation?.questions) {
      const orderOption = optionSelect.filter((option) => option.question_id === question.id);
      orderOptionSelect.push(
        orderOption[0] || { question_id: question.id, optionSelect: [], selection_type: question.selection_type }
      );
    }
    // -----------------answers from Back End----------------
    // it is obtained the id of the correct answer based on the score that is greater than 0
    const questionUniqueMultiple = (evaluation.questions ?? []).map((question) => {
      const option = question.options.filter((option) => option.score > 0);
      if (
        question.selection_type === 'unique' ||
        question.selection_type === 'multiple' ||
        question.selection_type === 'complete'
      ) {
        return option.map((option) => option.id);
      }
    });

    const fiterQuestion = questionUniqueMultiple.filter((question) => question !== undefined);

    const questionTrueFalse = (evaluation.questions ?? []).map((question) => {
      const option = question.options.filter((option) => option.score > 0);
      if (question.selection_type === 'true_false') {
        return option.map((option) => option.id);
      }
    });

    const fiterQuestionTrueFalse = questionTrueFalse.filter((question) => question !== undefined);

    // -----------------answers from Front End----------------
    // -----------------selection_type unique and multiple-------------------
    const userResponseUniqueMultiple = orderOptionSelect.map((response) => {
      if (
        response?.selection_type === 'unique' ||
        response?.selection_type === 'multiple' ||
        response?.selection_type === 'complete'
      ) {
        return response.optionSelect;
      }
    });
    // get options selected of user
    const filterUserResponseUniqueMultiple = userResponseUniqueMultiple.filter((response) => response !== undefined);

    let score = [];
    let optionSelected = [];
    for (let i = 0; i < filterUserResponseUniqueMultiple.length; i++) {
      const correctAnswer = fiterQuestion[i].map((item) => item);
      const userAnswer = filterUserResponseUniqueMultiple[i].map((item) => item);

      for (let j = 0; j < userAnswer.length; j++) {
        if (correctAnswer.includes(userAnswer[j])) {
          // get question id since JSON  of front-end
          const idQuestion = orderOptionSelect.map((option) => {
            if (option.optionSelect[j] === userAnswer[j]) {
              return option.question_id;
            }
          });

          // filtered current question id
          const filterQuestion = idQuestion.filter((question) => question !== undefined);
          const filterForId = evaluation.questions.filter((question) => question.id === filterQuestion[0]);
          // get score from answer current
          const filterScore = filterForId[0].options.map((options) => {
            if (options.id === correctAnswer[j]) {
              return options.score;
            }
          });

          const selectedAnswer = filterForId[0].options.map((options) => {
            if (options.id === userAnswer[j]) {
              return {
                title: filterForId[0].title,
                content: filterForId[0].content,
                scoreMax: filterForId[0].score,
                selection_type: filterForId[0].selection_type,
                options,
              };
            }
          });
          const scoreArray = filterScore.filter((item) => item !== undefined);
          const filterSelectedAnswer = selectedAnswer.filter((options) => options !== undefined);

          filterSelectedAnswer[0].answer = 'correct';
          optionSelected.push(filterSelectedAnswer[0]);

          score.push(scoreArray);
        } else {
          // get question id since JSON  of front-end
          const idQuestion = orderOptionSelect.map((option) => {
            if (option.optionSelect[j] === userAnswer[j]) {
              return option.question_id;
            }
          });

          // filtered current question id
          const filterQuestion = idQuestion.filter((question) => question !== undefined);
          const filterForId = evaluation.questions.filter((question) => question.id === filterQuestion[0]);

          const selectedAnswer = filterForId[0].options.map((options) => {
            if (options.id === userAnswer[j]) {
              return {
                title: filterForId[0].title,
                content: filterForId[0].content,
                scoreMax: filterForId[0].score,
                selection_type: filterForId[0].selection_type,
                options,
              };
            }
          });

          const filterSelectedAnswer = selectedAnswer.filter((item) => item !== undefined);
          filterSelectedAnswer[0].answer = 'incorrect';

          optionSelected.push(filterSelectedAnswer[0]);
        }
      }
    }
    // -----------------end selection_type unique and multiple-------------------

    // -------------------selection_type true_false----------------------

    const userResponseTrueFalse = orderOptionSelect.map((response) => {
      if (response.selection_type === 'true_false') {
        return response.optionSelect;
      }
    });
    // get options selected of user
    const filterUserResponseTrueFalse = userResponseTrueFalse.filter((response) => response !== undefined);

    const arrayAswerUserQuestion = [];
    for (let i = 0; i < filterUserResponseTrueFalse.length; i++) {
      const aswerUserQuestion = Object.keys(filterUserResponseTrueFalse[i]);
      arrayAswerUserQuestion.push(aswerUserQuestion);
    }

    for (let i = 0; i < arrayAswerUserQuestion.length; i++) {
      const correctAnswerTF = fiterQuestionTrueFalse[i].map((item) => item);
      const userAnswerTF = arrayAswerUserQuestion[i].map((item) => parseInt(item));
      for (let j = 0; j < userAnswerTF.length; j++) {
        if (correctAnswerTF[j] === userAnswerTF[j]) {
          // get question id since JSON  of front-end
          const idQuestion = orderOptionSelect.map((option) => {
            if (option.optionSelect[`${correctAnswerTF[j]}`]) {
              return option.question_id;
            }
          });

          const filterQuestion = idQuestion.filter((question) => question !== undefined);
          const filterForId = evaluation.questions.filter((question) => question.id === filterQuestion[0]);
          //let position = 0;
          const getFalseTrue = filterForId[0].options.map((falseTrue) => {
            if (falseTrue.id === correctAnswerTF[j]) {
              //return {title: filterForId[position].title, content: filterForId[position].content, scoreMax: filterForId[position].score, options};
              return falseTrue.true_false;
            }
          });

          const filterGetFalseTrue = getFalseTrue.filter((trueFalse) => trueFalse !== undefined);

          if (filterUserResponseTrueFalse[i][`${correctAnswerTF[j]}`] === filterGetFalseTrue[0].toString()) {
            // get score from answer current
            const filterScore = filterForId[0].options.map((options) => {
              if (options.id === correctAnswerTF[j]) {
                return options.score;
              }
            });

            const selectedAnswer = filterForId[0].options.map((options) => {
              if (options.id === correctAnswerTF[j]) {
                return {
                  title: filterForId[0].title,
                  content: filterForId[0].content,
                  scoreMax: filterForId[0].score,
                  selection_type: filterForId[0].selection_type,
                  options,
                };
              }
            });

            const scoreArray = filterScore.filter((item) => item !== undefined);
            const filterSelectedAnswer = selectedAnswer.filter((options) => options !== undefined);
            filterSelectedAnswer[0].answer = 'correct';

            optionSelected.push(filterSelectedAnswer[0]);
            score.push(scoreArray);
          } else {
            // get question id since JSON  of front-end
            const idQuestion = orderOptionSelect.map((option) => {
              if (option.optionSelect[`${correctAnswerTF[j]}`]) {
                return option.question_id;
              }
            });

            // filtered current question id
            const filterQuestion = idQuestion.filter((question) => question !== undefined);
            const filterForId = evaluation.questions.filter((question) => question.id === filterQuestion[0]);

            const selectedAnswer = filterForId[0].options.map((options) => {
              if (options.id === correctAnswerTF[j]) {
                return {
                  title: filterForId[0].title,
                  content: filterForId[0].content,
                  scoreMax: filterForId[0].score,
                  selection_type: filterForId[0].selection_type,
                  options,
                };
              }
            });

            const filterSelectedAnswer = selectedAnswer.filter((options) => options !== undefined);
            filterSelectedAnswer[0].answer = 'incorrect';

            optionSelected.push(filterSelectedAnswer[0]);
          }
        }
      }
    }
    // -------------------end selection_type false_true----------------------

    const flatArray = score.reduce((acc, item) => acc.concat(item), []);
    let finalScore = 0;
    flatArray.forEach(function (score) {
      finalScore += score;
    });

    finalScore = finalScore < 1 ? 1 : finalScore;

    const original_evaluation = await strapi
      .service('api::evaluations.evaluation')
      .findOne(evaluation_id, { populate: ['questions', 'questions.options'] });
    const userId = state.user.id;
    const scoreMax = evaluation.score;
    const presentationTime = new Date();
    let evaluation_result = [
      {
        original_evaluation,
        finalScore,
        optionSelected,
        close_confirmation: message,
        time_left: timeLeft,
        time_present: timePresent,
      },
    ];

    const entity = await strapi.db.query('api::user-evaluations.user-evaluation').findOne({
      where: { evaluation_id, user_id: userId, lesson: lesson_id, course: { slug: courseSlug }, cohort_id: cohort_id },
    });
    if (!entity) {
      try {
        const course = await strapi.db.query('api::courses.course').findOne({
          where: { slug: courseSlug },
        });
        await strapi.db.query('api::user-evaluations.user-evaluation').create({
          data: {
            evaluation_id,
            user_id: userId,
            evaluation_result,
            score_max: scoreMax,
            score_obtained: finalScore,
            cohort_id: cohort_id,
            presentation_time: presentationTime,
            course: course?.id,
            lesson: lesson_id,
          },
        });
        strapi.log.debug(
          { optionSelect: { data: evaluation_id, user: userId } },
          `Calificación realizada con exito, para el usuario: '${state?.user.email}'`
        );
      } catch (err) {
        strapi.log.error(
          { optionSelect: { data: evaluation_id, user: userId } },
          `Error al guardar la calificación de la evaluación para el usuario: '${state?.user.email}'`
        );
      }
    } else {
      const { attempts } = evaluation;
      const length = entity.evaluation_result.length;
      if (length >= attempts) {
        return ctx.badRequest('La cantidad de intentos realizados, ha superado a la cantidad máxima permitida');
      } else {
        try {
          await strapi
            .service('api::user-evaluations.user-evaluation')
            .update(entity.id, { data: { evaluation_result: [].concat(entity.evaluation_result, evaluation_result) } });
        } catch (err) {
          strapi.log.error(`fail edit evaluation ${entity.id}, ${err}`);
        }
      }
    }
    ctx.send({
      evaluation_id,
      option_selected: optionSelected,
      final_score: finalScore,
    });
  },
  async findOne(ctx) {
    const { id } = ctx.params;
    const { courseSlug } = ctx.request.query;
    const { state } = ctx;
    strapi.log.debug(`Obtener información de la evaluación con ID: ${id}`);
    // The evaluation of the database is obtained
    let result = [];
    if (state.user.role.id !== 3) {
      result = await strapi.db.query('api::evaluations.evaluation').findOne({
        where: { id: id, active: true },
        populate: ['questions', 'questions.options', 'lessons'],
      });
    } else {
      result = await strapi.service('api::evaluations.evaluation').findOne(id, {
        populate: ['questions', 'questions.options', 'lessons'],
      });
    }
    if (!result) {
      strapi.log.error(`No se encuentra la evaluación con el id: ${id} o se encuentra desactivada`);
      return ctx.notFound('La evaluación no existe o no se encuentra activa');
    }

    strapi.log.info({ result }, 'Evaluation');
    // The data is run, the correct answers are obtained and a new attribute is created with this value for the questions property
    result.questions.map((item) => {
      const option = item.options.filter((option) => option.score > 0);
      item.maxOptions = option.length;
    });

    if (courseSlug !== undefined) {
      let lessonsResult = await strapi.db.query('api::lessons.lesson').findMany({
        where: { course_id: { slug: courseSlug } },
      });
      const lessons = lessonsResult?.map((lesson) => lesson.id);
      result.lessons.forEach((lesson) => {
        if (lessons.includes(lesson.id)) lesson.view = true;
      });
    }

    let can_send_evaluation = true;
    if (result?.evaluation_finish_date) {
      const { evaluation_finish_date } = result;
      const now = new Date().toISOString();
      if (now > evaluation_finish_date) {
        can_send_evaluation = false;
      }
    }

    result.can_send_evaluation = can_send_evaluation;
    result.questions = fisherYatesShuffle(result.questions);
    result.questions.map((question) => {
      question.options = fisherYatesShuffle(question.options);
    });

    if (state?.user?.role?.id === 3) {
      return result;
    }

    result.questions.map((question) => {
      question.options.map((option) => {
        delete option.score;
      });
    });

    return result;
  },
  async update(ctx) {
    const customerIp = ctx.request.ip;
    const geo = geoip.lookup(customerIp);
    let data = ctx.request.body.data;
    const { evaluation_finish_date, id } = data;
    data.evaluation_finish_date = zonedTimeToUtc(evaluation_finish_date, geo?.timezone);
    const result = await strapi.service('api::evaluations.evaluation').update(id, ctx.request.body);
    return result;
  },
  async create(ctx) {
    const customerIp = ctx.request.ip;
    const geo = geoip.lookup(customerIp);
    let dataCreate = ctx.request.body;
    dataCreate.data.user_created = ctx.state.user.id;
    const { questions, evaluation_finish_date } = dataCreate.data;
    delete dataCreate?.data?.id;
    questions.map((question) => {
      delete question?.id;
      question.options.map((option) => delete option?.id);
    });
    dataCreate.data.evaluation_finish_date = zonedTimeToUtc(evaluation_finish_date, geo?.timezone);
    const result = await strapi.service('api::evaluations.evaluation').create(ctx.request.body);
    return result;
  },
}));
