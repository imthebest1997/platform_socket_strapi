/**
 * user games custom routes.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/user-games',
      handler: 'api::user-games.user-game.find',
    },
    {
      method: 'GET',
      path: '/user-games/:id',
      handler: 'api::user-games.user-game.findOne',
    },
    {
      method: 'POST',
      path: '/user-games',
      handler: 'api::user-games.user-game.create',
    },
    {
      method: 'PUT',
      path: '/user-games/:id',
      handler: 'api::user-games.user-game.update',
    },
    {
      method: 'PUT',
      path: '/find-create-user-games/',
      handler: 'api::user-games.user-game.findOrCreateData',
    },
    {
      method: 'PUT',
      path: '/update-user-games/:id',
      handler: 'api::user-games.user-game.uploadGameResult',
    },
    {
      method: 'DELETE',
      path: '/user-games/:id',
      handler: 'api::user-games.user-game.delete',
    },
  ],
};
