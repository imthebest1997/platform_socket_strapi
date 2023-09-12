/**
 * games custom routes.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/games',
      handler: 'api::games.game.find',
    },
    {
      method: 'GET',
      path: '/games/:id',
      handler: 'api::games.game.findOne',
    },
    {
      method: 'POST',
      path: '/games',
      handler: 'api::games.game.create',
    },
    {
      method: 'PUT',
      path: '/games/:id',
      handler: 'api::games.game.update',
    },
    {
      method: 'PUT',
      path: '/gamesUpdateLessons/:id',
      handler: 'api::games.game.updateLessons',
    },
    {
      method: 'DELETE',
      path: '/games/:id',
      handler: 'api::games.game.delete',
    },
    {
      method: 'PUT',
      path: '/deleteGameWithCourse/:courseSlug',
      handler: 'api::games.game.deleteGameRelationWithCourse',
    },
    {
      method: 'GET',
      path: '/gamesBySlug/:courseSlug',
      handler: 'api::games.game.findGamesByCourse',
    },
    {
      method: 'GET',
      path: '/gamesByTemplate',
      handler: 'api::games.game.findGamesTemplate',
    },
  ],
};
