'use strict';

module.exports = (policyContext, config, { strapi }) => {
  const { PolicyError } = require('strapi/utils').errors;
  strapi.log.info('userUpdate policy.');

  const { id: currentUserId } = policyContext.state.user;

  const userToUpdate = Number.parseInt(policyContext.params.id, 10);

  if (currentUserId !== userToUpdate) {
    throw new PolicyError('No tiene permisos para editar esta información');
  }

  return true;
};
