'use strict';
const { ForbiddenError } = require('@strapi/utils').errors;
/**
 * Lifecycle callbacks for the `videos` model.
 */

const amazonProvider = async (data) => {
  if (!data?.dash_playlist) {
    throw new ForbiddenError('El valor del campo dash_playlist, es obligatorio');
  }
  if (!data?.dash_url) {
    throw new ForbiddenError('El valor del campo dash_url, es obligatorio');
  }
  if (!data?.hls_url) {
    throw new ForbiddenError('El valor del campo hls_url, es obligatorio');
  }
  if (!data?.hls_playlist) {
    throw new ForbiddenError('El valor del campo hls_playlist, es obligatorio');
  }
};

const cloudflareProvider = async (data) => {
  if (!data?.dash_url) {
    throw new ForbiddenError('El valor del campo dash_url, es obligatorio');
  }
  if (!data?.hls_url) {
    throw new ForbiddenError('El valor del campo hls_url, es obligatorio');
  }
};

module.exports = {
  async beforeCreate(event) {
    let { data } = event.params;
    const { provider } = data;
    if (provider === 'amazon') {
      await amazonProvider(data);
    } else {
      await cloudflareProvider(data);
    }
  },
};
