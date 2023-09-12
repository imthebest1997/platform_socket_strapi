'use strict';
const { isEmpty } = require('lodash');
const { ValidationError } = require('@strapi/utils').errors;

/**
 * Lifecycle callbacks for the `courses` model.
 */

const validationData = (data) => {
  strapi.log.debug({ data }, 'Validation Data for Course: ');
  if (!data?.name) {
    throw new ValidationError('La propiedad Nombre es obligatoria');
  }
  if (!data?.short_name) {
    throw new ValidationError('La propiedad Nombre corto es obligatoria');
  }
  if (!data?.description) {
    throw new ValidationError('La propiedad Descripción es obligatoria');
  }
  if (!data?.slug) {
    throw new ValidationError('La propiedad Slug es obligatoria');
  }
  if (!data?.order) {
    throw new ValidationError('La propiedad Orden es obligatoria');
  }
  if (!data?.category) {
    throw new ValidationError('El curso deberá estar relacionado con una categoria');
  }
  if (!data?.active) {
    throw new ValidationError('La propiedad active es obligatoria');
  }
};

const updateCoursesChildren = async (data) => {
  const { id, description, category, course_template } = data;
  const cover = data?.cover ? data.cover.id : null;
  if (!course_template) {
    const childrens = await strapi.db.query('api::courses.course').findMany({
      where: { course_template: id },
    });
    for (const children of childrens) {
      await strapi.db.query('api::courses.course').update({
        where: { id: children.id },
        data: { description, category, cover },
      });
    }
  }
};

module.exports = {
  async beforeCreate(event) {
    let { data } = event.params;
    const { course_template } = data;
    if (!isEmpty(course_template.connect)) {
      const courseData = await strapi
        .service('api::courses.course')
        .findOne(course_template.connect[0].id, { populate: ['cover'] });
      data.name = courseData?.name;
      data.short_name = courseData?.short_name;
      data.description = courseData?.description;
      data.order = courseData?.order;
      data.category = courseData?.category;
      data.active = true;
      data.cover = courseData?.cover;
      data.slug = courseData?.slug;
    } else {
      validationData(data);
    }
  },
  async afterCreate(event) {
    const { result } = event;
    if (result?.course_template) {
      await strapi.service('api::courses.course').update(result?.id, {
        data: {
          slug: `${result?.slug}-${result?.id}`,
        },
      });
    }
  },
  async afterUpdate(event) {
    let { result } = event;
    await updateCoursesChildren(result);
  },
};
