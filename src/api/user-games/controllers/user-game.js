'use strict';

const { isEmpty } = require('lodash');

/**
 * user-game controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::user-games.user-game', ({ strapi }) => ({
  async findOrCreateData(ctx) {
    const { id } = ctx.state.user;
    let { courseSlug, lessonSlug, cohortId, game_id } = ctx.request.body;
    let data = await strapi.db.query('api::user-games.user-game').findOne({
      where: { course: { slug: courseSlug }, cohort_id: cohortId, lesson: { slug: lessonSlug }, user_id: id, game_id: game_id },
    });
    if (!data) {
      const courseData = await strapi.db.query('api::courses.course').findOne({
        where: { slug: courseSlug },
      });
      const lessonData = await strapi.db.query('api::lessons.lesson').findOne({
        where: { slug: lessonSlug },
      });
      data = await strapi.service('api::user-games.user-game').create({
        data: {
          user_id: id,
          course: courseData.id,
          lesson: lessonData.id,
          cohort_id: cohortId,
          game_result: [],
          last_level: 0,
          game_id: game_id,
        },
      });
    }
    return data;
  },
  async uploadGameResult(ctx) {
    const id = parseInt(ctx.params.id);
    const { /* game_id,  */game_result, level } = ctx.request.body;
    let dataGame = await strapi.db.query('api::user-games.user-game').findOne({
      where: { id: id },
      populate: { cohort_id: { select: ['id'], course: { select: ['id'] }, user_id: { select: ['id'] } } }
    });
    if (isEmpty(dataGame.game_result) || level > dataGame.last_level) {
      dataGame.game_result.push(game_result);
    } else {
      for (const result of dataGame.game_result) {
        if (result.level === level - 1) {
          result.solution = game_result.solution;
        }
      }
    }

    if (level > dataGame.last_level) {
      dataGame.last_level = level;
    }

    return await strapi.service('api::user-games.user-game').update(dataGame.id, { data: dataGame });
  },
}));
