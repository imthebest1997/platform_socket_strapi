'use strict';

/**
 * Lifecycle callbacks for the `products` model.
 */

const { isEmpty } = require('lodash');
const { ForbiddenError } = require('@strapi/utils').errors;

const validateRelationsCreate = (data) => {
  strapi.log.debug('Validation relations products before create ');
  const { courses, countries } = data;
  if (isEmpty(countries.connect)) {
    throw new ForbiddenError('Se debe de selecionar un país, para el producto');
  }
  if (isEmpty(courses.connect)) {
    throw new ForbiddenError('Se debe seleccionar al menos un curso para el producto');
  }
};

const validateRelationsUpdate = async (data, where) => {
  strapi.log.debug('Validation relations products before update ');
  const { id } = where;
  const { courses, countries } = data;
  const productData = await strapi.service('api::products.product').findOne(id, { populate: ['courses', 'countries'] });
  const amountCourses = productData.courses.length + courses.connect.length;
  const amountCountries = productData.countries.length + countries.connect.length;
  if (courses.disconnect.length >= amountCourses) {
    throw new ForbiddenError('Se debe seleccionar al menos un curso para el producto');
  }
  if (countries.disconnect.length >= amountCountries) {
    throw new ForbiddenError('Se debe seleccionar al menos un país para el producto');
  }
};

const validationData = (data) => {
  strapi.log.debug(`Validation Data for Products: ${data}`);
  const { name, price_in_cents, price_id, product_id, expires_in, slug } = data;

  if (!name) {
    throw new ForbiddenError('El nombre del producto es obligatorio');
  }
  if (!price_id) {
    throw new ForbiddenError('El ID del precio de Stripe es obligatorio');
  }
  if (!product_id) {
    throw new ForbiddenError('El ID del producto de Stripe es obligatorio');
  }
  if (price_in_cents <= 0) {
    throw new ForbiddenError('El precio en centavos debe ser un valor válido mayor a cero');
  }
  if (!slug) {
    throw new ForbiddenError('El slug del producto es obligatorio');
  }
  if (expires_in <= 0) {
    throw new ForbiddenError('El tiempo de expiración debe ser un valor válido mayor a cero');
  }
};

const trimParamsValidation = async (data) => {
  // Trim all the params after verifying there are present
  data.name = data.name?.trim?.();
  data.price_id = data?.price_id?.trim?.();
  data.product_id = data?.product_id?.trim?.();
};

const deleteCoursesFromUserCourses = async (params, data) => {
  const { id } = params;
  const { courses } = data;
  strapi.log.info(`delete permissons where delete courses in the collection product: ${id}`);
  if (courses.disconnect.length > 0) {
    const result = await strapi.db.query('api::user-purchases.user-purchase').findMany({
      where: { product: id, payment_status: 'paid' },
      populate: ['user'],
    });
    if (!isEmpty(result)) {
      for (const purchase of result) {
        for (const course of courses.disconnect) {
          strapi.log.debug(
            `Delete course id: ${course.id} from user: ${purchase?.user?.email} where payment status purchase be equal to paid`
          );
          const userCourses = await strapi.db.query('api::user-courses.user-course').findMany({
            where: { user_id: purchase?.user?.id, course_id: course.id, cohort_id: null },
          });
          for (const userCourse of userCourses) {
            await strapi.service('api::user-courses.user-course').delete(userCourse.id);
          }
        }
      }
    }
  }
};

const updateUserPurchases = async (data) => {
  const { id, update_by } = data;
  strapi.log.info(`updating collection user-purchases where product_id = ${id}`);
  const result = await strapi.db.query('api::user-purchases.user-purchase').findMany({
    where: { product: id, payment_status: 'paid' },
  });
  if (!isEmpty(result)) {
    for (const purchase of result) {
      await strapi
        .service('api::user-purchases.user-purchase')
        .update(purchase.id, { data: { update_by: update_by?.id, payment_status: 'paid' } });
    }
  }
};

module.exports = {
  async beforeCreate(event) {
    let { data } = event.params;
    validationData(data);
    validateRelationsCreate(data);
    trimParamsValidation(data);
  },
  async beforeUpdate(event) {
    let { data, where } = event.params;
    validationData(data);
    await validateRelationsUpdate(data, where);
    await deleteCoursesFromUserCourses(where, data);
    trimParamsValidation(data);
  },
  async afterUpdate(event) {
    const { result } = event;
    updateUserPurchases(result);
  },
  async beforeDelete(event) {
    const { where } = event.params;
    const { id } = where;
    const result = await strapi.db.query('api::user-purchases.user-purchase').findMany({
      where: { product: id, payment_status: 'paid' },
    });
    if (!isEmpty(result)) {
      //Por el momento, no retorna el mensaje pero si el error.
      throw new ForbiddenError(
        'No se puede realizar el evento de borrar, ya que este producto se encuentra relacionado con una compra de usuario'
      );
    }
  },
};
