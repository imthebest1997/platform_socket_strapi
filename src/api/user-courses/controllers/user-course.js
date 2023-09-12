'use strict';

/**
 *  user-courses controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::user-courses.user-course', ({ strapi }) => ({
  async findMyCourses(ctx) {
    const { user } = ctx.state;
    strapi.log.info(`find my courses for the user: ${user.email}`);
    const userCourses = await strapi.db.query('api::user-courses.user-course').findMany({
      where: { course_id: { active: true }, user_id: user?.id, active: true },
      orderBy: { course_id: { order: 'ASC' } },
      populate: ['course_id', 'course_id.cover', 'cohort_id'],
    });

    //Delete duplicate task records
    let userCoursesFilter = userCourses?.filter((currentValue, currentIndex, task) => {
      return (
        task.findIndex(
          (arrayValue) =>
            JSON.stringify(arrayValue.course_id.id) === JSON.stringify(currentValue.course_id.id) &&
            JSON.stringify(arrayValue.cohort_id?.id) === JSON.stringify(currentValue.cohort_id?.id)
        ) === currentIndex
      );
    });

    for (const myCourse of userCoursesFilter) {
      let percentage = await strapi.db.query('api::score-course.score-course').findOne({
        where: { cohort: myCourse?.cohort_id ? myCourse.cohort_id.id : null },
      });
      if (!percentage) {
        percentage = { maximun_score: 5, lessons_score: 1, evaluations_score: 1, tasks_score: 1, games_score: 1, more_score: [] };
      }
      let cohortData;
      if (myCourse.cohort_id?.id) {
        cohortData = await strapi.db.query('api::cohorts.cohort').findOne({
          where: { id: myCourse?.cohort_id ? myCourse.cohort_id.id : null },
        });
      } else {
        const courseData = await strapi
          .service('api::courses.course')
          .findOne(myCourse.course_id.id, { populate: { course_template: true } });
        const coursesId = courseData.course_template ? [courseData.id, courseData.course_template.id] : [courseData.id];
        const courseDataReferences = await strapi.service('api::courses.course').getEvaluationsAndTasks({ course: coursesId });
        cohortData = {
          references: courseDataReferences,
        };
      }
      const percentage_final = await strapi.service('api::users-progress.user-progress').getPercentajeUser({
        percentage: percentage,
        cohort: myCourse?.cohort_id ? myCourse.cohort_id.id : null,
        cohortData: cohortData,
        user: user.id,
      });
      myCourse.percentage = percentage_final.finalPercentage;
    }

    return userCoursesFilter;
  },
}));
