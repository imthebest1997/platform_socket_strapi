'use strict';

/**
 * videos default routes -> Create, Find, Update, Delete, FindOne..
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::videos.video');

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/videos',
      handler: 'api::videos.video.find',
    },
    {
      method: 'GET',
      path: '/videos/:id',
      handler: 'api::videos.video.findOne',
    },
    {
      method: 'POST',
      path: '/videos',
      handler: 'api::videos.video.create',
    },
    {
      method: 'PUT',
      path: '/videos/:id',
      handler: 'api::videos.video.update',
    },
    {
      method: 'PUT',
      path: '/uploadToVimeo',
      handler: 'api::videos.video.uploadVimeo',
      config: {
        policies: ['global::user-upload-videos'],
      },
    },
    {
      method: 'DELETE',
      path: '/videos/:id',
      handler: 'api::videos.video.delete',
    },
  ],
};
