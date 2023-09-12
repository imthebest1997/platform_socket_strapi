'use strict';

module.exports = (policyContext, config, { strapi }) => {
  const { PolicyError } = require('@strapi/utils').errors;
  strapi.log.info('is user book codes permissions.');
  const { id: currentUserId } = policyContext.state.user;
  const usersAdmins = [1, 6, 4198, 6393];

  if (process.env.NODE_ENV !== 'development') {
    usersAdmins.push(1044, 1074, 1095);
  }

  if (!usersAdmins.includes(currentUserId)) {
    throw new PolicyError('No tiene permisos para ejecutar está funcionalidad');
  }

  return true;
};
