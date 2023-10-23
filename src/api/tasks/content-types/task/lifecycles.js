"use strict";

const { difference, isEmpty } = require("lodash");
/**
 * Lifecycle callbacks for the `task` model.
 */

const trimParamsValidation = async (data) => {
  // Trim all the params after verifying there are present
  data.title = data.title?.trim?.();
  data.accepted_files = data?.accepted_files?.trim?.();
  data.content = data?.content?.trim?.();
};

const deleteReferenceCohort = async (params, data) => {
  const { id } = params;
  const { lessons } = data;
  let lessonsId = [];
  if (lessons?.disconnect) {
    lessonsId = lessons?.disconnect.map((lesson) => lesson.id);
  } else {
    const previusData = await strapi
      .service("api::tasks.task")
      .findOne(id, { populate: ["lessons"] });
    const idPreviusData = previusData?.lessons.map((res) => res.id);
    const lessonsData = difference(idPreviusData, lessons);
    lessonsId = lessonsData?.map((lesson) => lesson.id);
  }
  if (!isEmpty(lessonsId)) {
    const courses = await strapi.db.query("api::courses.course").findMany({
      where: { lessons: lessonsId },
    });
    let coursesId = courses.map((course) => course.id);
    const childrenCourses = await strapi.db
      .query("api::courses.course")
      .findMany({
        where: { course_template: coursesId },
      });
    if (!isEmpty(childrenCourses)) {
      const childrensId = childrenCourses.map((course) => course.id);
      coursesId = [].concat(coursesId, childrensId);
    }
    const cohorts = await strapi.db.query("api::cohorts.cohort").findMany({
      where: { course: coursesId },
      populate: { course: { select: ["id"] } },
    });
    for (const cohort of cohorts) {
      const { id, course } = cohort;
      const courseData = await strapi
        .service("api::courses.course")
        .findOne(course.id, { populate: { course_template: true } });
      const coursesId = courseData.course_template
        ? [courseData.id, courseData.course_template.id]
        : [courseData.id];
      let courseDataReferences = await strapi
        .service("api::courses.course")
        .getEvaluationsAndTasks({ course: coursesId });
      courseDataReferences.tasks.ids = courseDataReferences.tasks.ids.filter(
        (id) => id !== params.id
      );
      courseDataReferences.tasks.amount = courseDataReferences.tasks.ids.length;
      await strapi
        .service("api::cohorts.cohort")
        .update(id, {
          data: { references: courseDataReferences, active: true },
        });
    }
  }
};

const addReferenceCohort = async (data) => {
  const { id } = data;
  const lessonsResult = await strapi.db.query("api::tasks.task").findOne({
    where: { id: id },
    populate: { lessons: { select: ["id"] } },
  });
  const lessonsId = lessonsResult.lessons.map((lesson) => lesson.id);
  const courses = await strapi.db.query("api::courses.course").findMany({
    where: { lessons: lessonsId },
  });
  let coursesId = courses.map((course) => course.id);
  const childrenCourses = await strapi.db
    .query("api::courses.course")
    .findMany({
      where: { course_template: coursesId },
    });
  if (!isEmpty(childrenCourses)) {
    const childrensId = childrenCourses.map((course) => course.id);
    coursesId = [].concat(coursesId, childrensId);
  }
  const cohorts = await strapi.db.query("api::cohorts.cohort").findMany({
    where: { course: coursesId },
    populate: { course: { select: ["id"] } },
  });
  for (const cohort of cohorts) {
    const { id, course } = cohort;
    await strapi
      .service("api::cohorts.cohort")
      .update(id, {
        data: {
          updateReferences: true,
          isActiveLessons: true,
          course: course.id,
        },
      });
  }
};

const createGrantPermissions = async (data) => {
  const { id } = data;
  const lessonsResult = await strapi.db.query("api::tasks.task").findOne({
    where: { id: id },
    populate: { lessons: { select: ["id", "references", "content"] } },
  });
  let references;
  for (const lesson of lessonsResult?.lessons) {
    if (!lesson?.content?.includes(`<Task id="${id}"/>`)) {
      const content = lesson?.content + `\n<Task id="${id}"/>`;
      if (!lesson.references) {
        references = {
          evaluations: [],
          tasks: [id],
        };
      } else {
        references = lesson.references;
        references.tasks = [].concat(lesson.references.tasks, id);
      }
      await strapi.service("api::lessons.lesson").update(lesson?.id, {
        data: {
          content: content,
          references: references,
        },
      });
    }
  }
};

const validateRelationLesson = async (params, data) => {
  const { id } = params;
  const { lessons } = data;
  if (lessons?.connect) {
    await removePermissions(lessons.disconnect, id);
    await grantPermissions(lessons.connect, id);
  } else {
    const previusData = await strapi
      .service("api::tasks.task")
      .findOne(id, { populate: ["lessons"] });
    const idPreviusData = previusData?.lessons.map((res) => res.id);
    await removePermissions(difference(idPreviusData, lessons), id);
    await grantPermissions(difference(lessons, idPreviusData), id);
  }
};

const removePermissions = async (lessons, taskId) => {
  for (const lesson of lessons) {
    const id = lesson?.id ? lesson.id : lesson;
    const lessonsData = await strapi.service("api::lessons.lesson").findOne(id);
    const deleteContent = `\\n<Task id=\\"${taskId}\\"\\/>`;
    const regex = new RegExp(deleteContent, "g");
    const content = lessonsData.content.replace(regex, "");
    lessonsData.references.tasks = lessonsData.references.tasks.filter(
      (task) => task !== taskId
    );
    await strapi
      .service("api::lessons.lesson")
      .update(id, {
        data: { content: content, references: lessonsData.references },
      });
  }
};

const grantPermissions = async (lessons, taskId) => {
  let references;
  for (const lesson of lessons) {
    const id = lesson?.id ? lesson.id : lesson;
    const result = await strapi.service("api::lessons.lesson").findOne(id);
    if (!result?.content?.includes(`<Task id="${taskId}"/>`)) {
      const content = result?.content + `\n<Task id="${taskId}"/>`;
      if (!result.references) {
        references = {
          evaluations: [],
          tasks: [taskId],
        };
      } else {
        references = result.references;
        references.tasks = [].concat(result.references.tasks, taskId);
      }
      await strapi
        .service("api::lessons.lesson")
        .update(id, { data: { content: content, references: references } });
    }
  }
};

//TODO: New function to get students id.
const getStudentsIdAndCohortId = async (lessons) => {
  const lesson = await strapi.db.query("api::lessons.lesson").findOne({
    where: { id: lessons },
    populate: ["course_id"],
  });

  if (!lesson) {
    return [];
  }

  const course = await strapi.db.query("api::courses.course").findOne({
    where: { id: lesson.course_id.id },
    populate: ["cohort"],
  });

  if (!course) {
    return [];
  }

  const cohort = await strapi.db.query("api::cohorts.cohort").findOne({
    where: { id: course.cohort.id },
    populate: ["students"],
  });

  if (!cohort) {
    return [];
  }

  return {
    cohort: cohort.id,
    students: cohort.students.map((student) => student.id),
    slug_course: course.slug,
  };
};

//TODO: Solo se usa cuando se pide usar el Content Manager de Strapi
const getLessonIdAndSlug = async (taskId) => {
  const task = await strapi.db.query("api::tasks.task").findOne({
    where: { id: taskId },
    populate: ["lessons"],
  });

  if (!task) {
    return [];
  }

  return {
    slug: task.lessons[0].slug,
    lessonId: task.lessons.map((lesson) => lesson.id),
  };
};

const createNotificationsToAllUsers = async ({ notification, students }) => {
  for (const student of students) {
    const strapiData = {
      data: {
        ...notification,
        user: student,
      },
    };
    await strapi.db.query("api::notification.notification").create(strapiData);
  }
};

const getNotificationsId = async (taskId) => {
  const notifications = await strapi.db
    .query("api::notification.notification")
    .findMany();

  const filteredNotifications = notifications.filter(
    (notification) => notification.body.id_actividad === taskId
  );

  if (!notifications) {
    return [];
  }

  return filteredNotifications.map((notification) => notification.id);
};

const updateNotificationsToAllUsers = async (notification, notificationsId) => {
  for (const id of notificationsId) {
    await strapi.db.query("api::notification.notification").update({
      where: { id: id },
      data: {
        ...notification,
      },
    });
    console.log("Notificacion actualizada");
  }
};

module.exports = {
  async beforeCreate(event) {
    let { data } = event.params;
    trimParamsValidation(data);
  },

  async afterCreate(event) {
    //TODO: Todo funcionara cuando se use React o Postman para consumir la peticion (con params)
    //TODO: Para enviar desde el content manager hay q hacer una peticion adicional.
    const { result, params } = event;
    // const { data } = params;
    // const { lessons } = data;
    await createGrantPermissions(result);
    await addReferenceCohort(result);

    const { lessonId, slug } = await getLessonIdAndSlug(result.id);
    const { cohort, students, slug_course } = await getStudentsIdAndCohortId(lessonId);

    //Objeto para crear notificaciones.
    const link = `/${slug_course}/${slug}`;

    const notification = {
      title: result.title,
      isRead: false,
      isOpenPanel: false,
      link,
      cohort,
      fecha_emision: new Date(),
      body: {
        message: result.content,
        slug,
        id_actividad: result.id,
        fecha_emision: new Date(),
        tipo_actividad: "tasks",
      },
    };

    await createNotificationsToAllUsers({ notification, students });
    await strapi.emitToAllUsers({ students, message: "Task created from lifecycle", nameEvent: "task_created" });
  },

  async beforeUpdate(event) {
    let { data, where } = event.params;
    trimParamsValidation(data);
    await validateRelationLesson(where, data);
    await deleteReferenceCohort(where, data);
  },

  async afterUpdate(event) {
    const { result } = event;
    await addReferenceCohort(result);

    const { lessonId, slug } = await getLessonIdAndSlug(result.id);
    const notificationsId = await getNotificationsId(result.id);
    const { students } = await getStudentsIdAndCohortId(lessonId);

    const notification = {
      title: result.title,
      fecha_emision: new Date(),
      body: {
        message: result.content,
        slug,
        id_actividad: result.id,
        fecha_emision: new Date(),
        tipo_actividad: "tasks",
      },
    };
    await updateNotificationsToAllUsers(notification, notificationsId);
    await strapi.emitToAllUsers({ students, message: "Task created from lifecycle", nameEvent: "task_created" });
  },
};
