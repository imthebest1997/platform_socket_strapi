'use strict';

const { isEmpty } = require('lodash');

const { ForbiddenError } = require('@strapi/utils').errors;

/**
 * Lifecycle callbacks for the `user-purchases` model.
 */

const validationProduct = (data) => {
  strapi.log.info(`validation product and data for user-purchases from data: ${JSON.stringify(data)}`);
  const { user, product } = data;
  if (data?.platform) {
    if (!user) {
      throw new ForbiddenError('El campo Usuario es obligatorio');
    }
    if (!product) {
      throw new ForbiddenError('El campo Producto es obligatorio');
    }
  } else {
    if (isEmpty(user.connect)) {
      throw new ForbiddenError('El campo Usuario es obligatorio');
    }
    if (isEmpty(product.connect)) {
      throw new ForbiddenError('El campo Producto es obligatorio');
    }
  }
};

const validationShippingAddress = (params, data) => {
  strapi.log.info(`validation shipping addres and dat for user-purchases from data: ${JSON.stringify(data)}`);
  const { has_physical_items, name, last_name, email, country, city, address, phone, proof_of_payment } = data;
  if (!name && has_physical_items) {
    throw new ForbiddenError('El campo Nombre es obligatorio');
  }
  if (!last_name && has_physical_items) {
    throw new ForbiddenError('El campo Apellido es obligatorio');
  }
  if (!email && has_physical_items) {
    throw new ForbiddenError('El campo email es obligatorio');
  }
  if (!country && has_physical_items) {
    throw new ForbiddenError('El campo País es obligatorio');
  }
  if (!city && has_physical_items) {
    throw new ForbiddenError('El campo Ciudad es obligatorio');
  }
  if (!address && has_physical_items) {
    throw new ForbiddenError('El campo dirección es obligatorio');
  }
  if (!phone && has_physical_items) {
    throw new ForbiddenError('El campo teléfono es obligatorio');
  }
  if (proof_of_payment?.length > 6) {
    throw new ForbiddenError('La cantidad máxima establecida para los comprobantes de pago ha sido superada');
  }
};

const registerUsersCourses = async (data) => {
  let { payment_status, payment_method, months_expiration, id, updated_by } = data;
  const purchaseResult = await strapi
    .service('api::user-purchases.user-purchase')
    .findOne(id, { populate: ['product', 'product.courses', 'user'] });
  let { product, user } = purchaseResult;
  const courses = product?.courses.map((course) => course.id);
  user = user?.id ? user.id : user;
  if (payment_method === 'Card' && payment_status === 'paid') {
    strapi.log.debug(
      `Register users id: ${user?.email} in the courses: ${JSON.stringify(courses)} where paymnet method='Card' ans status='paid'`
    );
    let currentDate = new Date();
    let expire = new Date(currentDate.setMonth(currentDate.getMonth() + months_expiration));
    for (const course of courses) {
      await createOrUpdate(user, course, expire, updated_by?.id ? updated_by.id : updated_by);
    }
  }
};

const registerOrDeletePermits = async (params, data) => {
  let purchaseResult;
  let courses = [];
  let user;
  if (params?.id) {
    purchaseResult = await strapi
      .service('api::user-purchases.user-purchase')
      .findOne(params.id, { populate: ['product', 'product.courses', 'user', 'updatedBy'] });
    purchaseResult.payment_method = data.payment_method;
    purchaseResult.payment_status = data.payment_status;
    purchaseResult.updated_by = data.updatedBy || purchaseResult.updatedBy.id;
  } else {
    purchaseResult = await strapi.db.query('api::user-purchases.user-purchase').findOne({
      where: { payment_intent: params.payment_intent },
      populate: ['product', 'product.courses', 'user', 'updatedBy'],
    });
    purchaseResult.payment_status = 'refunded';
    purchaseResult.updated_by = purchaseResult.updatedBy.id;
  }
  for (const course of purchaseResult?.product?.courses) {
    courses.push(course.id);
  }
  user = purchaseResult?.user?.id;
  strapi.log.info(
    'Delete, create or update courses according to payment status (paid -> register or update opposite case delete)'
  );
  const { payment_status, months_expiration, payment_method, updated_by } = purchaseResult;
  let currentDate, expire;
  switch (payment_status) {
    case 'paid':
      currentDate = new Date();
      expire = new Date(currentDate.setMonth(currentDate.getMonth() + months_expiration));
      for (const course of courses) {
        await createOrUpdate(user, course, expire, updated_by);
      }
      if (payment_method === 'Transfer') {
        await sendPaymentConfirmationEmail(purchaseResult);
      }
      break;
    default:
      for (const course of courses) {
        await deleteUserCourse(user, course);
      }
  }
};

const deletePermissions = async (params) => {
  const result = await strapi.service('api::user-purchases.user-purchase').findOne(params.id, { populate: ['courses', 'user'] });
  const { user, courses } = result;
  if (user && courses) {
    for (const course of courses) {
      await deleteUserCourse(user.id, course.id);
    }
  }
};

const getNameCourseAndSlug = async (course) => {
  const result = await strapi.service('api::courses.course').findOne(course);
  return { name: result.name, slug: result.slug };
};

const sendPaymentConfirmationEmail = async (Purchase) => {
  const { email, name, last_name, product } = Purchase;
  let data = [],
    article = 'el curso';
  for (const course of product.courses) {
    data = [].concat(await getNameCourseAndSlug(course.id), data);
  }
  if (data.length > 1) {
    article = 'los cursos';
  }
  const emailTemplate = {
    subject: 'Pago recibido y confirmado',
    text: '.',
    html: `<!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="utf-8">
              <title>holi</title>
            </head>
            <body >
            <!--Copia desde aquí-->
            <table style="max-width: 600px; padding: 10px; margin:0 auto; border-collapse: collapse;">
              <tr>
                <td style="padding: 0">
                  <img style="padding: 0 0 15px 0; display: block" src="https://roboticawolf.com/images/7968cd42ddfa91037a091433bf5e656b.png" width="100%">
                </td>
              </tr>
              <tr>
                <td style="background-color: #ecf0f1; padding-top: 15px; border-radius: 15px;">
                  <div style="color: #34495e; margin: 4% 10% 2%; text-align: justify;font-family: sans-serif">
                    <h2 style="color: #e67e22;">Hola ${name} ${last_name}!</h2>
                    <p style="margin: 2px; font-size: 15px">
                       El pago para ${article}: ${data.map(
      (course) => `<a href="${process?.env?.URL}/cursos/${course.slug}" style="text-decoration: unset;"> ${course.name}</a>`
    )}, ha sido confirmado con éxito. Ya puedes disfrutar de su contenido!.</p>
                    &nbsp;
                    <div style="width: 100%; text-align: center; padding-bottom: 15px;">
                      <a style="text-decoration: none; border-radius: 5px; padding: 11px 23px; color: white; background-color: #3498db" href="${
                        process?.env?.URL
                      }/cursos">Ir a mis cursos</a>
                    </div>
                  </div>
                </td>
              </tr>
            </table>
            </body>
            </html>`,
  };

  await strapi.plugins['email'].services.email.sendTemplatedEmail(
    {
      to: email,
    },
    emailTemplate
  );
};

const deleteUserCourse = async (user, courseId) => {
  const result = await strapi.db.query('api::user-courses.user-course').findOne({
    where: { user_id: user, course_id: courseId, cohort_id: null },
  });
  strapi.log.debug(`Delete course: ${courseId}, in the user: ${user}`);
  if (result) {
    await strapi.service('api::user-courses.user-course').delete(result.id);
  }
};

const createOrUpdate = async (userId, courseId, expire, updated_by) => {
  const results = await strapi.db.query('api::user-courses.user-course').findOne({
    where: { user_id: userId, course_id: courseId, cohort_id: null },
  });
  strapi.log.debug(`Create or update course: ${courseId}, in the user: ${userId}`);
  const entity = results || null;
  if (!entity) {
    await strapi.service('api::user-courses.user-course').create({
      data: { course_id: courseId, user_id: userId, active: true, expiration_date: expire },
    });
  } else {
    await strapi.service('api::user-courses.user-course').update(entity.id, {
      data: { updated_by: updated_by, expiration_date: expire },
    });
  }
};

module.exports = {
  async afterCreate(event) {
    const { result } = event;
    registerUsersCourses(result);
  },
  async beforeCreate(event) {
    let { data } = event.params;
    validationProduct(data);
  },
  async beforeUpdate(event) {
    let { data, where } = event.params;
    validationShippingAddress(where, data);
    registerOrDeletePermits(where, data);
  },
  async beforeDelete(event) {
    const { where } = event.params;
    deletePermissions(where);
  },
};
