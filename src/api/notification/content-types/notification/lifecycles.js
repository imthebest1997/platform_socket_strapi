'use strict';

const { difference, isEmpty } = require('lodash');

/**
 * Lifecycle callbacks for the `notifications` model.
 */

const trimParamsValidation = async (data) => {
  // Trim all the params after verifying there are present
  data.title = data.title?.trim?.();
  data.accepted_files = data?.accepted_files?.trim?.();
  data.content = data?.content?.trim?.();
};

module.exports = {
  async beforeCreate(event) {
    let { data } = event.params;
    trimParamsValidation(data);
  },

  async afterCreate(event) {
    const { result } = event;
  },

  async beforeUpdate(event) {
    let { data, where } = event.params;
    trimParamsValidation(data);
  },

  async afterUpdate(event) {
    const { result} = event;

  },
};
