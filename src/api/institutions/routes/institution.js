/**
 * institution custom routes.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/institutions',
      handler: 'api::institutions.institution.find',
      config: {
        policies: ['global::user-upload-book-codes'],
      },
    },
    {
      method: 'GET',
      path: '/institutions/:id',
      handler: 'api::institutions.institution.findOne',
    },
    {
      method: 'GET',
      path: '/findStudentByInstitution/:cohort',
      handler: 'api::institutions.institution.findStudentsByInstitution',
    },
    {
      method: 'POST',
      path: '/institutions',
      handler: 'api::institutions.institution.create',
    },
    {
      method: 'PUT',
      path: '/institutions/:id',
      handler: 'api::institutions.institution.update',
    },
    {
      method: 'DELETE',
      path: '/institutions/:id',
      handler: 'api::institutions.institution.delete',
    },
  ],
};
