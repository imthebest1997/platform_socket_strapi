"use strict";
const sendNotification = require("../../../../plugins/send-notification");
const { getActiveUsers } = require("../../../../external-services/active-users-service");

const trimParamsValidation = async (data) => {
  // Trim all the params after verifying there are present
  data.title = data.title?.trim?.();
  data.description = data?.description?.trim?.();
  data.content = data?.content?.trim?.();
};

const getCohortByForum = async (forumId) => {
  const forum = await strapi.db.query("api::forums.forum").findOne({
    where: { id: forumId },
    populate: ["cohort"],
  });

  if (!forum) {
    return [];
  }

  return {
    cohortId: forum.cohort.id,
  };
};

const getStudentsIdAndCourseId = async (cohortId) => {
  const cohort = await strapi.db.query("api::cohorts.cohort").findOne({
    where: { id: cohortId },
    populate: ["course", "students"]
  });

  if (!cohort) {
    return [];
  }

  return {
    students: cohort.students.map((student) => student.id),
    slug_course: cohort.course.slug,
  };
};

const createNotificationsToAllUsers = async (notification, students) => {
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

const getNotificationsId = async (forumId) => {
  const notifications = await strapi.db
    .query("api::notification.notification")
    .findMany();

  const filteredNotifications = notifications.filter(
    (notification) => notification.body.id_actividad === forumId
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
    const { result } = event;

    // await createGrantPermissions(result);
    // await addReferenceCohort(result);

    const { cohortId } = await getCohortByForum(result.id);
    const { students, slug_course } = await getStudentsIdAndCourseId(cohortId);

    //Objeto para crear notificaciones.
    const link = `/${slug_course}/foros/${result.id}`;

    const notification = {
      title: result.title,
      isRead: false,
      isOpenPanel: false,
      link,
      cohort: cohortId,
      fecha_emision: new Date(),
      body: {
        message: result.content,
        id_actividad: result.id,
        fecha_emision: new Date(),
        tipo_actividad: "forums",
      },
    };

    //Sockets y coleccion de usuarios conectados.
    const activeUsers = await getActiveUsers();
    const { sockets } = require("../../../../index");

    if (
      sockets &&
      activeUsers &&
      activeUsers?.length > 0 &&
      students &&
      students.length > 0
    ) {
      console.log("Sending notifications");
      await createNotificationsToAllUsers(notification, students);
      await sendNotification(
        students,
        activeUsers,
        sockets,
        "Forum created sucessfull",
        "forum_created"
      );
    } else {
      console.error("Uno de los datos enviados está vacío.");
      console.log(sockets);
    }
  },

  async beforeUpdate(event) {
    let { data, where } = event.params;
    trimParamsValidation(data);
    // await validateRelationLesson(where, data);
    // await deleteReferenceCohort(where, data);
  },

  async afterUpdate(event) {
    const { result } = event;
    // await addReferenceCohort(result);

    const { cohortId } = await getCohortByForum(result.id);
    const { students } = await getStudentsIdAndCourseId(cohortId);

    const notificationsId = await getNotificationsId(result.id);
    const { sockets } = require("../../../../index");

    const notification = {
      title: result.title,
      fecha_emision: new Date(),
      body: {
        message: result.content,
        id_actividad: result.id,
        fecha_emision: new Date(),
        tipo_actividad: "forums",
      },
    };


    //Sockets y coleccion de usuarios conectados.
    const activeUsers = await getActiveUsers();
    if (
      sockets &&
      activeUsers &&
      activeUsers?.length > 0 &&
      students &&
      students.length > 0 &&
      notificationsId &&
      notificationsId.length > 0
    ) {
      console.log("Sending notifications");
      await updateNotificationsToAllUsers(notification, notificationsId);
      await sendNotification(
        students,
        activeUsers,
        sockets,
        "Forum updated sucessful",
        "forum_updated"
      );
    } else {
      console.error("Uno de los datos enviados está vacío.");
    }
  },
};
