'use strict';

module.exports = (policyContext, config, { strapi }) => {
  const { PolicyError } = require('@strapi/utils').errors;
  strapi.log.info('is user upload videos permissions.');
  const { id: currentUserId } = policyContext.state.user;
  const usersAdmins = [1, 6, 285, 329, 572, 6393, 12873, 13409, 4198];
  if (process.env.NODE_ENV !== 'development') {
    usersAdmins.push(1044, 1074, 1095);
  }

  if (!usersAdmins.includes(currentUserId)) {
    throw new PolicyError('No tiene permisos para ejecutar está funcionalidad');
  }

  return true;
};
