'use strict';

/**
 * Lifecycle callbacks for the `user progresses` model.
 */

const getFinished = async (general_data, cohort) => {
  let finished = false;
  if (
    general_data.evaluations[0] == cohort?.references?.evaluations?.amount &&
    general_data.tasks[0] == cohort?.references?.tasks?.amount &&
    general_data.lessons[0] == cohort?.references?.lessons?.amount &&
    general_data.games[0] == cohort?.references?.games?.amount
  ) {
    finished = true;
  }
  return finished;
};

const finishedCourse = async (where, data) => {
  let finished = data?.finished;
  if (!finished) {
    const { id } = where;
    const userProgress = await strapi.db.query('api::users-progress.user-progress').findOne({
      where: { id: id },
      populate: { cohort: { select: ['references'] } },
    });
    const { cohort } = userProgress;
    const general_data = data?.general_data ? data.general_data : userProgress.general_data;
    finished = await getFinished(general_data, cohort);
    data.finished = finished;
  }
};

module.exports = {
  async beforeUpdate(event) {
    let { data, where } = event.params;
    await finishedCourse(where, data);
  },
};
