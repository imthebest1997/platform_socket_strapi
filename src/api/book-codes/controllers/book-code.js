'use strict';

const { isEmpty } = require('lodash');
const Hashids = require('hashids');
const { format } = require('date-fns');

/**
 *  book codes controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::book-codes.book-code', ({ strapi }) => ({
  async findMyBookCodes(ctx) {
    let myBookCodes = await strapi.db.query('api::book-codes.book-code').findMany({
      where: { activated_by: ctx.state.user.id },
      populate: { cohort: { populate: { course: { select: ['name'] } } } },
    });
    for (const myBookCode of myBookCodes) {
      if (myBookCode.cohort) {
        myBookCode.courseName = myBookCode.cohort.course.name;
      } else {
        const slug = await strapi.service('api::book-codes.book-code').getSlugCourse({ grade: myBookCode.grade });
        let myCourse = await strapi.db.query('api::courses.course').findOne({
          where: { slug: slug },
        });
        myBookCode.courseName = myCourse?.name;
      }
    }
    return myBookCodes;
  },

  /* async registerBookCodes(ctx) {
    const { bookCode } = ctx.request.body;
    const { code, grade, number, generated_date, generated_by } = bookCode;
    let cohort = bookCode?.cohort || null;
    const generated_by_id = generated_by === 'jsoto' ? 4198 : 1;
    const generated_date_value = new Date(generated_date);
    const bookCodeResult = await strapi.db.query('api::book-codes.book-code').findOne({
      where: { code: code },
    });
    if (!bookCodeResult) {
      await strapi.db.query('api::book-codes.book-code').create({
        data: {
          code: code,
          grade: grade,
          number: number,
          generated_by: generated_by_id,
          generated_date: generated_date_value,
          cohort: cohort,
        },
      });
    }
    ctx.send({
      message: 'ok',
    });
  }, */

  async createBookCodes(ctx) {
    const { cohort, amount } = ctx.request.body;
    const hashids = new Hashids(
      process.env.HASHIDS_API_SECRET,
      parseInt(process.env.HASHIDS_API_SECRET_NUMBER),
      process.env.HASHIDS_API_SECRET_STRING
    );
    const lastConsult = await strapi.db.query('api::book-codes.book-code').findMany({ where: { cohort: cohort } });
    let current_number = 1;
    let grade = null;
    if (isEmpty(lastConsult)) {
      const { rows } = await strapi.db.connection.raw('SELECT MAX(grade) FROM "book_codes";');
      grade = rows[0].max + 1;
    } else {
      grade = lastConsult[0].grade;
      const { rows } = await strapi.db.connection.raw(
        `SELECT MAX(number) FROM "book_codes" where grade=${lastConsult[0].grade};`
      );
      current_number = rows[0].max + 1;
    }
    let result = [];
    const last_number = current_number + parseInt(amount);
    const generated_by = ctx.state.user.id;
    for (var i = current_number; i < last_number; i++) {
      const code = hashids.encode(grade, i);
      result.push({
        code: code,
        grade: grade,
        number: i,
        generated_date: format(new Date(), 'dd/MM/yyyy hh:mm:ss aaaa'),
        generated_by: `${ctx.state.user.email}`,
        cohort: cohort,
      });
      await strapi.db.query('api::book-codes.book-code').create({
        data: {
          code: code,
          grade: grade,
          number: i,
          generated_by: generated_by,
          generated_date: new Date(),
          cohort: cohort,
        },
      });
    }
    return result;
  },
  async activeBookCode(ctx) {
    const { code } = ctx.params;
    const { myInstitution, changeCode } = ctx.request.body;
    let bookCode = [];
    if (changeCode && !isEmpty(myInstitution)) {
      bookCode = await strapi.db.query('api::book-codes.book-code').findOne({
        where: { cohort: { institution: myInstitution.value }, number: changeCode[0].number },
        populate: { activated_by: true, cohort: { populate: { institution: { select: ['id'] }, students: true } } },
      });
    } else if (changeCode && (changeCode[0].valid === 0 || changeCode[0].valid === 1)) {
      bookCode = await strapi.db.query('api::book-codes.book-code').findOne({
        where: { number: changeCode[0].number, grade: changeCode[0].grade },
        populate: { activated_by: true, cohort: { populate: { institution: { select: ['id'] }, students: true } } },
      });
    } else {
      bookCode = await strapi.db.query('api::book-codes.book-code').findOne({
        where: { code: code },
        populate: { activated_by: true, cohort: { populate: { institution: { select: ['id'] }, students: true } } },
      });
    }
    if (!bookCode) {
      return ctx.badRequest(`El código de libro ${code} es inválido`);
    }
    if (bookCode.activated_by) {
      const { email, dni } = bookCode.activated_by;
      return ctx.badRequest(
        `El código de libro ${code} ya ha sido activado previamente por el usuario: Email: ${email} ${
          dni ? `, Dni: ${dni}` : '.'
        }`
      );
    }
    let data = { redeem_code: true };
    if (bookCode?.cohort) {
      data = { redeem_code: true, institution: bookCode.cohort.institution.id };
    } else {
      const institution = await strapi.service('api::book-codes.book-code').getInstitutionCourse({ grade: bookCode.grade });
      if (institution) {
        data = { redeem_code: true, institution: institution };
      }
    }
    await strapi.service('api::book-codes.book-code').update(bookCode.id, { data: { activated_by: ctx.state.user.id } });
    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: ctx.state.user.id },
      data: data,
    });
    ctx.send({
      message: 'Código Canjeado con Éxito',
    });
  },
}));
