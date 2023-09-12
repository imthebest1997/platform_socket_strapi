'use strict';

const { difference, isEmpty } = require('lodash');

const { ValidationError } = require('@strapi/utils').errors;

/**
 * Lifecycle callbacks for the `evaluations` model.
 */

const validateScoreTotal = (data, questions) => {
  strapi.log.debug(`Validando score iniciado, para la prueba: ${data.title}`);
  const evaluationScore = parseFloat(data.score);
  const score = questions.map((question) => question.options?.map((option) => option.score));

  const reduceArrayScore = score?.reduce((acc, score) => acc.concat(score), []);

  let totalScore = 0;
  reduceArrayScore.forEach((score) => (totalScore += parseFloat(score)));
  const scoreIsSame = totalScore === evaluationScore;
  if (!scoreIsSame) {
    strapi.log.error(`La suma total del puntaje por pregunta es diferente al puntaje total de la prueba: ${data.title}`);
    throw new ValidationError('La suma total del puntaje por pregunta es diferente al puntaje total de la prueba!');
  }
  strapi.log.debug(`Score total validado con exito, para la prueba: ${data.title}`);
};

const validateQuestionScore = (data, questions) => {
  strapi.log.debug(`Validando score por cada pregunta, iniciado, para la prueba: ${data.title}`);
  questions.map((question) => {
    const score = parseFloat(question.score);
    let totalScore = 0;
    question.options?.map((option) => (totalScore += parseFloat(option.score)));
    const scoreIsSame = totalScore === score;
    if (!scoreIsSame) {
      strapi.log.error(`La suma total del puntaje por opciones es diferente al puntaje total de la pregunta: ${question.title}`);
      throw new ValidationError(
        `La suma total del puntaje por opciones es diferente al puntaje total de la pregunta: ${question.title}!`
      );
    }
    strapi.log.debug(`Score total validado con exito, para la pregunta: ${question.title}`);
  });
};

const validateUniqueQuestion = (data, questions) => {
  strapi.log.debug(`Validando preguntas únicas iniciado para la prueba: ${data.title}`);
  questions.map((question) => {
    if (question?.selection_type === 'unique' || question?.selection_type === 'complete') {
      const titleQuestion = question?.title;
      let validateOnlyOption = 0;
      return question?.options.map((option) => {
        if (option.score > 0) {
          validateOnlyOption += 1;
          if (validateOnlyOption > 1) {
            if (question?.selection_type === 'unique') {
              strapi.log.debug(`Las pregunta de tipo unico, no pueden tener más de una respuesta!. Pregunta: ${titleQuestion} `);
              throw new ValidationError(
                `Las pregunta de tipo unico, no pueden tener más de una respuesta!. Pregunta: ${titleQuestion} `
              );
            } else {
              strapi.log.debug(
                `Las pregunta de tipo completar, no pueden tener más de una respuesta!. Pregunta: ${titleQuestion}`
              );
              throw new ValidationError(
                `Las pregunta de tipo completar, no pueden tener más de una respuesta!. Pregunta: ${titleQuestion}`
              );
            }
          }
        }
      });
    }
  });
};

const validateCompleteChoiceQuestion = (data, questions) => {
  strapi.log.debug(`Validando preguntas para completar, iniciado para la prueba: ${data.title}`);
  questions.map((question) => {
    if (question?.selection_type === 'complete') {
      question.options.map((option) => {
        const titleOption = option?.title;
        const hasSeparator = option?.title.includes('---') || option?.title.includes('–––');
        const hasTwoOptions = option?.title.split('-').length > 1 || option?.title.split('–').length > 1;
        if (hasTwoOptions) {
          if (!hasSeparator) {
            strapi.log.error(
              `Formato no válido para opción doble, debe existir una separacion de tres guiones medios(---). Opción: ${titleOption}.`
            );
            throw new ValidationError(
              `Formato no válido para opción doble, debe existir una separacion de tres guiones medios(---). Opción: ${titleOption}.`
            );
          }
        }
      });
    }
  });
};

const validateQuestionInContext = (data, questions) => {
  strapi.log.debug(`Validando contenido de las preguntas completar, iniciado para la prueba: ${data.title}`);
  questions.map((question) => {
    if (question?.selection_type === 'complete') {
      const hasContent = question.content?.split('\n').join('');
      if (question.content === null || question.content === undefined || hasContent === '') {
        const titleQuestion = question?.title;
        throw new ValidationError(`Contenido de la pregunta vacio. Pregunta: ${titleQuestion}`);
      } else {
        const titleQuestion = question?.title;
        const countSeparatorQuestion = question.content.match(/___/g);
        if (countSeparatorQuestion) {
          const countSeparatorOption = question?.options[0]?.title.includes('---')
            ? question.options[0]?.title.split('---').length
            : 1;
          if (countSeparatorOption != countSeparatorQuestion.length) {
            strapi.log.error(
              `La cantidad de separadores (---), no corresponde con la cantidad de opciones de respuesta: ${titleQuestion}.`
            );
            throw new ValidationError(
              `La cantidad de separadores (---), no corresponde con la cantidad de opciones de respuesta: ${titleQuestion}.`
            );
          }
        } else {
          strapi.log.error(
            `La pregunta, debe de contener el separator (___) 'tres guiones bajos [ _ ]', para el respectivo campo de completar: ${titleQuestion}.`
          );
          throw new ValidationError(
            `La pregunta, debe de contener el separator (___) 'tres guiones bajos [ _ ]', para el respectivo campo de completar: ${titleQuestion}.`
          );
        }
      }
    }
  });
};

const validateTrueFalseChoice = (data, questions) => {
  strapi.log.debug(`Validando preguntas true false, iniciado para la prueba: ${data.title}`);
  questions.map((question) => {
    if (question?.selection_type === 'true_false') {
      question.options.map((option) => {
        const titleOption = option.title;
        if (option?.true_false === null || option?.true_false === undefined) {
          throw new ValidationError(`La opción es verdadera o falsa? Opción: ${titleOption}.`);
        }
      });
    }
  });
};

const deleteReferenceCohort = async (params, data) => {
  const { id } = params;
  const { lessons } = data;
  let lessonsId = [];
  if (lessons?.disconnect) {
    lessonsId = lessons?.disconnect.map((lesson) => lesson.id);
  } else {
    const previusData = await strapi.service('api::evaluations.evaluation').findOne(id, { populate: ['lessons'] });
    const idPreviusData = previusData?.lessons.map((res) => res.id);
    lessonsId = difference(idPreviusData, lessons);
  }
  if (!isEmpty(lessonsId)) {
    const courses = await strapi.db.query('api::courses.course').findMany({
      where: { lessons: lessonsId },
    });
    let coursesId = courses.map((course) => course.id);
    const childrenCourses = await strapi.db.query('api::courses.course').findMany({
      where: { course_template: coursesId },
    });
    if (!isEmpty(childrenCourses)) {
      const childrensId = childrenCourses.map((course) => course.id);
      coursesId = [].concat(coursesId, childrensId);
    }
    const cohorts = await strapi.db.query('api::cohorts.cohort').findMany({
      where: { course: coursesId },
      populate: { course: { select: ['id'] } },
    });
    for (const cohort of cohorts) {
      const { id, course } = cohort;
      const courseData = await strapi.service('api::courses.course').findOne(course.id, { populate: { course_template: true } });
      const coursesId = courseData.course_template ? [courseData.id, courseData.course_template.id] : [courseData.id];
      let courseDataReferences = await strapi.service('api::courses.course').getEvaluationsAndTasks({ course: coursesId });
      courseDataReferences.evaluations.ids = courseDataReferences.evaluations.ids.filter((id) => id !== params.id);
      courseDataReferences.evaluations.amount = courseDataReferences.evaluations.ids.length;
      await strapi.service('api::cohorts.cohort').update(id, { data: { references: courseDataReferences, active: true } });
    }
  }
};

const addReferenceCohort = async (data) => {
  const { id } = data;
  const lessonsResult = await strapi.db.query('api::evaluations.evaluation').findOne({
    where: { id: id },
    populate: { lessons: { select: ['id'] } },
  });
  const lessonsId = lessonsResult.lessons.map((lesson) => lesson.id);
  const courses = await strapi.db.query('api::courses.course').findMany({
    where: { lessons: lessonsId },
  });
  let coursesId = courses.map((course) => course.id);
  const childrenCourses = await strapi.db.query('api::courses.course').findMany({
    where: { course_template: coursesId },
  });
  if (!isEmpty(childrenCourses)) {
    const childrensId = childrenCourses.map((course) => course.id);
    coursesId = [].concat(coursesId, childrensId);
  }
  const cohorts = await strapi.db.query('api::cohorts.cohort').findMany({
    where: { course: coursesId },
    populate: { course: { select: ['id'] } },
  });
  for (const cohort of cohorts) {
    const { id, course } = cohort;
    await strapi
      .service('api::cohorts.cohort')
      .update(id, { data: { updateReferences: true, isActiveLessons: true, course: course.id } });
  }
};

const createGrantPermissions = async (data) => {
  const { id } = data;
  let references;
  const lessonsResult = await strapi.db.query('api::evaluations.evaluation').findOne({
    where: { id: id },
    populate: { lessons: { select: ['id', 'references', 'content'] } },
  });
  for (const lesson of lessonsResult?.lessons) {
    if (!lesson?.content?.includes(`<Evaluation id="${id}"/>`)) {
      const content = lesson?.content + `\n<Evaluation id="${id}"/>`;
      if (!lesson.references) {
        references = {
          evaluations: [id],
          tasks: [],
        };
      } else {
        references = lesson.references;
        references.evaluations = [].concat(lesson.references.evaluations, id);
      }
      await strapi.service('api::lessons.lesson').update(lesson?.id, {
        data: {
          content: content,
          references: references,
        },
      });
    }
  }
};

const validateRelationLesson = async (data, params) => {
  const { id } = params;
  const { lessons } = data;
  if (lessons?.connect) {
    await removePermissions(lessons.disconnect, id);
    await grantPermissions(lessons.connect, id);
  } else {
    const previusData = await strapi.service('api::evaluations.evaluation').findOne(id, { populate: ['lessons'] });
    const idPreviusData = previusData?.lessons.map((res) => res.id);
    await removePermissions(difference(idPreviusData, lessons), id);
    await grantPermissions(difference(lessons, idPreviusData), id);
  }
};

const removePermissions = async (lessons, evaluationId) => {
  for (const lesson of lessons) {
    const id = lesson?.id ? lesson.id : lesson;
    const lessonsData = await strapi.service('api::lessons.lesson').findOne(id);
    const deleteContent = `\\n<Evaluation id=\\"${evaluationId}\\"\\/>`;
    const regex = new RegExp(deleteContent, 'g');
    const content = lessonsData.content.replace(regex, '');
    lessonsData.references.evaluations = lessonsData.references.evaluations.filter((evaluation) => evaluation !== evaluationId);
    await strapi.service('api::lessons.lesson').update(id, { data: { content: content, references: lessonsData.references } });
  }
};

const grantPermissions = async (lessons, evaluationId) => {
  let references;
  for (const lesson of lessons) {
    const id = lesson?.id ? lesson.id : lesson;
    const result = await strapi.service('api::lessons.lesson').findOne(id);
    if (!result?.content?.includes(`<Evaluation id="${evaluationId}"/>`)) {
      const content = result?.content + `\n<Evaluation id="${evaluationId}"/>`;
      if (!result?.references) {
        references = {
          evaluations: [evaluationId],
          tasks: [],
        };
      } else {
        references = result.references;
        references.evaluations = [].concat(result.references.evaluations, evaluationId);
      }

      await strapi.service('api::lessons.lesson').update(id, { data: { content: content, references: references } });
    }
  }
};

const getQuestions = async (data) => {
  return data?.validate ? data.validate : data.questionsOverwrite;
};

module.exports = {
  async beforeCreate(event) {
    let { data } = event.params;
    const questions = await getQuestions(data);
    validateCompleteChoiceQuestion(data, questions);
    validateQuestionInContext(data, questions);
    validateTrueFalseChoice(data, questions);
    validateUniqueQuestion(data, questions);
    validateScoreTotal(data, questions);
    validateQuestionScore(data, questions);
  },
  async afterCreate(event) {
    const { result } = event;
    await createGrantPermissions(result);
    await addReferenceCohort(result);
  },
  async beforeUpdate(event) {
    let { data, where } = event.params;
    if (!data?.update) {
      const questions = await getQuestions(data);
      validateCompleteChoiceQuestion(data, questions);
      validateQuestionInContext(data, questions);
      validateTrueFalseChoice(data, questions);
      validateUniqueQuestion(data, questions);
      validateScoreTotal(data, questions);
      validateQuestionScore(data, questions);
    }
    await validateRelationLesson(data, where);
    await deleteReferenceCohort(where, data);
  },
  async afterUpdate(event) {
    const { result } = event;
    await addReferenceCohort(result);
  },
};