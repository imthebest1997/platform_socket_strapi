/**
 * book codes custom routes.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/book-codes',
      handler: 'api::book-codes.book-code.find',
    },
    {
      method: 'GET',
      path: '/my-book-codes',
      handler: 'api::book-codes.book-code.findMyBookCodes',
    },
    {
      method: 'GET',
      path: '/book-codes/:id',
      handler: 'api::book-codes.book-code.findOne',
    },
    {
      method: 'POST',
      path: '/book-codes',
      handler: 'api::book-codes.book-code.create',
    },
    {
      method: 'PUT',
      path: '/book-codes/:id',
      handler: 'api::book-codes.book-code.update',
    },
    {
      method: 'PUT',
      path: '/book-codes-active/:code',
      handler: 'api::book-codes.book-code.activeBookCode',
    },
    {
      method: 'PUT',
      path: '/create-book-codes',
      handler: 'api::book-codes.book-code.createBookCodes',
      config: {
        policies: ['global::user-upload-book-codes'],
      },
    },
    {
      method: 'DELETE',
      path: '/book-codes/:id',
      handler: 'api::book-codes.book-code.delete',
    },
  ],
};
