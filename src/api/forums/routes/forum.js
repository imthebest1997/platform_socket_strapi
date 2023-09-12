'use strict';

/**
 * forum router
 */
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/forums',
      handler: 'api::forums.forum.find',
    },
    {
      method: 'GET',
      path: '/forums/my-forums/:courseSlug',
      handler: 'api::forums.forum.findMyForums',
    },
    {
      method: 'GET',
      path: '/forums/:id',
      handler: 'api::forums.forum.findOne',
    },
    {
      method: 'POST',
      path: '/forums',
      handler: 'api::forums.forum.create',
    },
    {
      method: 'POST',
      path: '/forums/:id/reply',
      handler: 'api::forums.forum.replyForum',
    },
    {
      method: 'POST',
      path: '/forums/:id/reply/:replyId',
      handler: 'api::forums.forum.replyAnswerForum',
    },
    {
      method: 'PUT',
      path: '/forums/:id',
      handler: 'api::forums.forum.update',
    },
    {
      method: 'DELETE',
      path: '/forums/:id',
      handler: 'api::forums.forum.delete',
    },
  ],
};
