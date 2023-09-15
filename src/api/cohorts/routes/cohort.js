/**
 * courses custom routes.
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/cohorts',
      handler: 'api::cohorts.cohort.find',
    },
    {
      method: 'GET',
      path: '/cohorts/:id',
      handler: 'api::cohorts.cohort.findOne',
    },
    {
      method: 'GET',
      path: '/findMyCohorts/:cohort',
      handler: 'api::cohorts.cohort.findMyCohorts',
    },
    {
      method: 'GET',
      path: '/findCohortsToNotification',
      handler: 'api::cohorts.cohort.findCohortsToNotification',
    },
    {
      method: 'GET',
      path: '/findChortsInstitution/:institution',
      handler: 'api::cohorts.cohort.findCohortByInstitution',
      config: {
        policies: ['global::user-upload-book-codes'],
      },
    },
    {
      method: 'GET',
      path: '/getDataCohort/:cohort',
      handler: 'api::cohorts.cohort.getDataCohort',
    },
    {
      method: 'GET',
      path: '/findCohortsMigrate/:cohort',
      handler: 'api::cohorts.cohort.findCohortsToMigrate',
    },
    {
      method: 'POST',
      path: '/cohorts',
      handler: 'api::cohorts.cohort.create',
    },
    {
      method: 'PUT',
      path: '/cohorts/:id',
      handler: 'api::cohorts.cohort.update',
    },
    {
      method: 'PUT',
      path: '/registerStudents/:cohort_id',
      handler: 'api::cohorts.cohort.registerStudentFromExcel',
    },
    {
      method: 'PUT',
      path: '/migrateStudent',
      handler: 'api::cohorts.cohort.migrateStudent',
    },
    {
      method: 'PUT',
      path: '/updatePermissions',
      handler: 'api::cohorts.cohort.updatePermissions',
    },
    {
      method: 'PUT',
      path: '/updateReferences',
      handler: 'api::cohorts.cohort.updateAmountReferences',
    },
    {
      method: 'DELETE',
      path: '/cohorts/:id',
      handler: 'api::cohorts.cohort.delete',
    },
  ],
};
