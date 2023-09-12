'use strict';

const { isEmpty } = require('lodash');

/**
 * forum controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

const isCloseForum = (date) => {
  const now = new Date();
  const target = new Date(date);
  // Compare the target date with the current date (now)
  return now < target;
};

const getAmountReply = ({ answers_by_users }) => {
  let amount = answers_by_users.length;
  for (const answersUsers of answers_by_users) {
    amount += answersUsers.answers.length;
  }
  return amount;
};

const getAmountUniquesUsers = (answers_by_users, userId) => {
  let usersId = [userId];
  for (const answersUsers of answers_by_users) {
    if (!usersId.includes(answersUsers.user.id)) {
      usersId.push(answersUsers.user.id);
    }
    for (const answers of answersUsers.answers) {
      if (!usersId.includes(answers.user.id)) {
        usersId.push(answers.user.id);
      }
    }
  }
  return usersId.length;
};

module.exports = createCoreController('api::forums.forum', ({ strapi }) => ({
  async findOne(ctx) {
    const { id } = ctx.params;
    const { cohort } = ctx.query;
    strapi.log.debug(`Get information by forum with ID: ${id}`);
    let result = await strapi.db.query('api::forums.forum').findOne({
      where: { id, cohort },
      populate: {
        classes: true,
        user: { select: ['name', 'last_name'], populate: { profile_photo: { select: ['url'] } } },
        answers_by_users: {
          select: ['content', 'published'],
          populate: {
            user: { select: ['name', 'last_name'], populate: { profile_photo: { select: ['url'] } } },
            answers: {
              select: ['content', 'published'],
              populate: { user: { select: ['name', 'last_name'], populate: { profile_photo: { select: ['url'] } } } },
            },
          },
        },
      },
    });
    if (!isEmpty(result)) {
      result.isOpen = isCloseForum(result?.open_until);
      result.amountReply = getAmountReply(result);
      result.amountUsers = getAmountUniquesUsers(result.answers_by_users, result.user.id);
    }
    return result;
  },
  async find(ctx) {
    const { cohort } = ctx.query;
    strapi.log.debug(`Get query information forum requested by user ${ctx.state.user?.email}`);
    return strapi.db.query('api::forums.forum').findMany({
      where: { cohort },
      populate: {
        user: { select: ['name', 'last_name'], populate: { profile_photo: { select: ['url'] } } },
        answers_by_users: {
          select: ['content', 'published'],
          populate: {
            user: { select: ['name', 'last_name'], populate: { profile_photo: { select: ['url'] } } },
            answers: {
              select: ['content', 'published'],
              populate: { user: { select: ['name', 'last_name'], populate: { profile_photo: { select: ['url'] } } } },
            },
          },
        },
      },
    });
  },
  async findMyForums(ctx) {
    const { cohort } = ctx.query;
    strapi.log.debug(`Get query information forum requested by user ${ctx.state.user?.email}`);
    return strapi.db.query('api::forums.forum').findMany({
      where: { cohort },
      populate: {
        user: { select: ['name', 'last_name'], populate: { profile_photo: { select: ['url'] } } },
        answers_by_users: {
          select: ['content', 'published'],
          populate: {
            user: { select: ['name', 'last_name'], populate: { profile_photo: { select: ['url'] } } },
            answers: {
              select: ['content', 'published'],
              populate: { user: { select: ['name', 'last_name'], populate: { profile_photo: { select: ['url'] } } } },
            },
          },
        },
      },
    });
  },
  async replyForum(ctx) {
    const { id } = ctx.params;
    const { content, user } = ctx.request.body;
    const mainReply = await strapi.entityService.findOne('api::forums.forum', id, {
      populate: { answers_by_users: true },
    });
    mainReply.answers_by_users.push({ content, user, published: new Date() });
    const result = await strapi.entityService.update('api::forums.forum', id, {
      data: mainReply,
    });
    return result;
  },
  async replyAnswerForum(ctx) {
    const { id, replyId } = ctx.params;
    const { content, user } = ctx.request.body;
    const reply = await strapi.entityService.findOne('api::forums.forum', id, {
      populate: { answers_by_users: { populate: { answers: true } } },
    });
    const replyIndex = reply.answers_by_users.findIndex((ans) => ans.id === Number(replyId));
    if (replyId === -1) throw new Error('404');
    reply.answers_by_users[replyIndex].answers.push({ content, user, published: new Date() });
    const result = await strapi.entityService.update('api::forums.forum', id, { data: reply });
    return result;
  },
  async create(ctx) {
    const payload = ctx.request.body;
    const result = await strapi.service('api::forums.forum').create(payload);
    return result;
  },
  async update(ctx) {
    const { id } = ctx.params;
    const payload = ctx.request.body;
    const result = await strapi.service('api::forums.forum').update(id, payload);
    return result;
  },
}));
