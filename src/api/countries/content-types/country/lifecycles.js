'use strict';

/**
 * Lifecycle callbacks for the `countries` model.
 */

const trimParamsValidation = async (data) => {
  // Trim all the params after verifying there are present
  data.name = data.name?.trim?.();
  data.code = data?.code?.trim?.();
};

module.exports = {
  async beforeCreate(event) {
    let { data } = event.params;
    trimParamsValidation(data);
  },
  async beforeUpdate(event) {
    let { data } = event.params;
    trimParamsValidation(data);
  },
};
