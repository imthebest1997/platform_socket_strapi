'use strict';

module.exports = (policyContext /*config, { strapi }*/) => {
  return !!policyContext.state.user;
};
