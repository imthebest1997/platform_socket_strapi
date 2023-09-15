'use strict';
const { differenceBy, difference, isEmpty } = require('lodash');
/**
 *  book codes controller -> falta, validar el endPoint registerStudentsFromExcel y update
 */

const { createCoreController } = require('@strapi/strapi').factories;

const sendRegistrationConfirmationEmail = async (usersFound, usersNotFound, user, course) => {
  const { name, last_name, email } = user;
  const nombre = 'nombre',
    apellido = 'apellido',
    correo = 'correo';
  const emailTemplate = {
    subject: 'Confirmación Registros de estudiantes',
    text: '.',
    html: `<!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="utf-8">
              <title>holi</title>
              <style>
                #customers {
                  font-family: Arial, Helvetica, sans-serif;
                  border-collapse: collapse;
                  width: 100%;
                }

                #customers td, #customers th {
                  border: 1px solid #ddd;
                  padding: 8px;
                }

                #customers tr:nth-child(even){background-color: #f2f2f2;}

                #customers tr:hover {background-color: #ddd;}

                #customers th {
                  padding-top: 12px;
                  padding-bottom: 12px;
                  text-align: left;
                  background-color: #04AA6D;
                  color: white;
                  min-width: 100px;
                }
                </style>
            </head>
            <body >
            <table style="max-width: 800px; padding: 10px; margin:0 auto; border-collapse: collapse;">
              <tr>
                <td style="padding: 0">
                  <img style="padding: 0 0 15px 0; display: block" src="https://roboticawolf.com/images/7968cd42ddfa91037a091433bf5e656b.png" width="100%">
                </td>
              </tr>
              <tr>
                <td style="background-color: #ecf0f1; padding-top: 15px; border-radius: 15px;">
                  <div style="color: #34495e; margin: 4% 10% 2%; text-align: justify;font-family: sans-serif">
                    <h2 style="color: #e67e22;">Hola ${name} ${last_name}!</h2>
                    <p style="margin: 2px; font-size: 15px">
                    El proceso solicitado de registrar estudiantes por medio de un excel para el ${course}, culmino con éxito, a continuación, se otorgará un resumen de este proceso. </p>
                    ${!isEmpty(usersFound)
        ? `<p>Estudiantes, matriculados con éxito </p>
                      <div style="style="max-width: 800px;">
                        <table id="customers">
                          <tr>
                            <th>Nombres</th>
                            <th>Apellidos</th>
                            <th>Correo</th>
                          </tr>
                          ${usersFound
          .map(
            (user, index) =>
              `<tr data-index=${index}>
                            <td>${user[nombre]}</td>
                            <td>${user[apellido]}</td>
                            <td>${user[correo]}</td>
                            </tr>`
          )
          .join('')}
                        </table>
                      </div>`
        : '<br >'
      }
                    ${!isEmpty(usersNotFound)
        ? `<p>Estudiantes, que no se pudierón matricular (No se encontrarón datos) </p>
                      <div style="style="max-width: 800px;">
                        <table id="customers">
                          <tr>
                            <th>Nombres</th>
                            <th>Apellidos</th>
                            <th>Correo</th>
                          </tr>
                          ${usersNotFound
          .map(
            (user) =>
              `<tr>
                              <td>${user[nombre]}</td>
                              <td>${user[apellido]}</td>
                              <td>${user[correo]}</td>
                            </tr>`
          )
          .join('')}
                        </table>
                      </div>`
        : '<br >'
      }
                  </div>
                  <br>
                  <footer style="text-align: center">
                    <address>
                      Generado por: Robotica Wolf, fecha: ${new Date().toISOString().slice(0, 10)}<br>
                      Plataforma: <a href="https://roboticawolf.com/" style="text-decoration: unset;"> roboticawolf</a> <br >
                      Soporte: info@roboticawolf.com <br>
                      Telefono: +593 99 677 9364 <br>
                    </address>
                  </footer>
                  <br >
                </td>
              </tr>
            </table>
            </body>
            </html>`,
  };

  await strapi.plugins['email'].services.email.sendTemplatedEmail(
    {
      to: email,
    },
    emailTemplate
  );
};

const updateData = async (collection, datawhere, dataUpdate) => {
  const resultData = await strapi.db.query(collection).findMany({
    where: datawhere,
  });
  for (const result of resultData) {
    await strapi.db.query(collection).update({
      where: { id: result.id },
      data: dataUpdate,
    });
  }
};

module.exports = createCoreController('api::cohorts.cohort', ({ strapi }) => ({
  async find(ctx) {
    const { cohort_id, course } = ctx.query;
    strapi.log.debug(`Obtener los estudiantes del cohort: ${cohort_id}, con el docente: ${ctx.state.user.id}`);
    let result;
    if (cohort_id) {
      result = await strapi.db.query('api::cohorts.cohort').findOne({
        where: { id: cohort_id, teachers: ctx.state.user.id },
        populate: ['students'],
      });
    } else {
      result = await strapi.db.query('api::cohorts.cohort').findOne({
        where: { course: course, teachers: ctx.state.user.id },
        populate: ['activated_by'],
      });
    }
    return result;
  },

  async getDataCohort(ctx) {
    const { cohort } = ctx.params;
    const result = await strapi.db.query('api::cohorts.cohort').findOne({
      where: { id: cohort },
      populate: { course: { select: ['name'] }, institution: { select: ['name'], populate: { logo: { select: ['url', 'ext', 'width', 'height'] } } } },
    });
    const { name, course, institution } = result;
    return {
      teacher: `${ctx.state.user.name} ${ctx.state.user.last_name}`,
      course: course.name,
      name: name,
      institution: institution.name,
      logo: institution?.logo?.url,
      ext: institution?.logo?.ext,
      dimen: { width: institution?.logo?.width, height: institution?.logo?.height }
    };
  },

  async findCohortByInstitution(ctx) {
    const { institution } = ctx.params;
    strapi.log.debug(`get cohorts with institution relation id: ${institution}`);
    return await strapi.db.query('api::cohorts.cohort').findMany({ where: { institution: institution } });
  },

  async findMyCohorts(ctx) {
    const { cohort } = ctx.params;
    let myCohorts = await strapi.db.query('api::cohorts.cohort').findMany({
      where: { teachers: ctx.state.user.id },
      populate: ['students'],
    });
    let myCohort = await strapi.service('api::cohorts.cohort').findOne(cohort, { populate: ['students'] });
    let result = myCohorts?.filter((myCohort) => myCohort.id != cohort);
    result.map((res) => {
      res.students = differenceBy(res.students, myCohort.students, 'id');
    });
    const resultCohorts = result.filter((cohort) => !isEmpty(cohort.students));
    let resultCohort = {
      active: !isEmpty(resultCohorts),
      cohorts: resultCohorts,
    };
    return resultCohort;
  },

  async findCohortsToMigrate(ctx) {
    const { cohort } = ctx.params;
    let cohortData = await strapi.db.query('api::cohorts.cohort').findOne({
      where: { id: cohort },
      populate: {
        course: { select: ['id'], populate: { course_template: { select: ['id'] } } },
        institution: { select: ['id'] },
      },
    });
    const { course, institution } = cohortData;
    let coursesId = course.course_template ? [course.id, course.course_template.id] : [course.id];
    let coursesData = await strapi.db.query('api::courses.course').findMany({
      where: { course_template: coursesId },
      populate: { course: { select: ['id'], populate: { course_template: { select: ['id'] } } } },
    });
    const coursesMigrate = coursesData.map((course) => course.id);
    let cohortsData = await strapi.db.query('api::cohorts.cohort').findMany({
      where: { course: coursesMigrate, institution: institution.id },
    });
    let result = cohortsData?.filter((c) => c.id != cohort);
    return result;
  },

  async migrateStudent(ctx) {
    let { cohort, newCohort, studentsMigrate } = ctx.request.body;
    strapi.log.debug(
      `Iniciando proceso para migrar estudiantes id: [${studentsMigrate.map(
        (student) => student
      )}], del cohort id: ${cohort} al cohort id: ${newCohort}`
    );
    const newCohortData = await strapi.db.query('api::cohorts.cohort').findOne({
      where: { id: newCohort },
      populate: ['students', 'course'],
    });
    let { students, course } = newCohortData;
    if (isEmpty(students)) {
      students = studentsMigrate;
    } else {
      students = students.map((s) => s.id);
      students = [].concat(students, studentsMigrate);
    }
    for (const studentMigrate of studentsMigrate) {
      await updateData(
        'api::user-evaluations.user-evaluation',
        { user_id: studentMigrate, cohort_id: cohort },
        { cohort_id: newCohort, course: course.id, migrate: true }
      );
      await updateData(
        'api::user-tasks.user-task',
        { user: studentMigrate, cohort: cohort },
        { cohort: newCohort, course: course.id, migrate: true }
      );
      await updateData(
        'api::user-games.user-game',
        { user_id: studentMigrate, cohort_id: cohort },
        { cohort_id: newCohort, course: course.id, migrate: true }
      );
    }
    await strapi.db.query('api::cohorts.cohort').update({
      where: { id: newCohortData?.id },
      data: { studentsData: students, active: true, course: course?.id, registerUsers: true },
    });
    ctx.send({
      message: 'ok',
    });
  },

  async registerStudentFromExcel(ctx) {
    const { cohort_id } = ctx.params;
    const usersRegister = ctx.request.body;
    let users = [],
      usersFound = [],
      usersNotFound = [];
    let user = [];
    for (let userRegister of usersRegister) {
      if (userRegister['correo']) {
        user = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: {
            $or: [
              {
                email: userRegister['correo'],
              },
              {
                name: userRegister['nombre'],
                last_name: userRegister['apellido'],
              },
            ],
          },
        });
      } else {
        user = await strapi.db.query('plugin::users-permissions.user').findOne({
          where: { name: userRegister['nombre'], last_name: userRegister['apellido'] },
        });
      }
      if (user) {
        users.push(user.id);
        usersFound.push({ nombre: user.name, apellido: user.last_name, correo: user.email });
      } else {
        usersNotFound.push(userRegister);
      }
    }
    const cohort = await strapi.service('api::cohorts.cohort').findOne(cohort_id, { populate: ['students'] });
    const idStudents = cohort?.students.map((student) => student.id);
    const studentRegister = difference(users, idStudents);
    await strapi
      .service('api::cohorts.cohort')
      .update(cohort_id, { data: { students: [].concat(idStudents, studentRegister), active: true } });
    await sendRegistrationConfirmationEmail(usersFound, usersNotFound, ctx.state.user, cohort?.course?.name);
    ctx.send({
      message: 'ok',
    });
  },

  async updatePermissions(ctx) {
    strapi.log.debug(`Se van a actualizar los permisos. Petición realizado por el docente: ${ctx.state.user.id}`);
    const results = await strapi.db.query('api::cohorts.cohort').findMany({
      where: { course: { $not: null } },
      populate: { course: { select: ['id'] } },
    });
    for (const result of results) {
      await strapi.db.query('api::cohorts.cohort').update({
        where: { id: result.id },
        data: { course_id: result.course.id, updatePermission: true, active: true, name: result.name },
      });
    }
    ctx.send({ message: 'Se actualizaron los cursos con éxito' });
  },
  async updateAmountReferences(ctx) {
    strapi.log.debug(`Se van a actualizar las referencias del cohort. Petición realizado por el docente: ${ctx.state.user.id}`);
    const results = await strapi.db
      .query('api::cohorts.cohort')
      .findMany({ where: { course: { $not: null } }, populate: { course: { select: ['id'] } } });
    for (const result of results) {
      await strapi.db.query('api::cohorts.cohort').update({
        where: { id: result.id },
        data: { course: result.course.id, updateReferences: true, isActiveLessons: true, active: true, name: result.name },
      });
    }
    ctx.send({ message: 'Se actualizaron las referencias con éxito' });
  },
  async findCohortsToNotification(ctx) {
    const { cohort_id, course } = ctx.query;
    strapi.log.debug(`Obtener los estudiantes del cohort: ${cohort_id}, con el docente: ${ctx.state.user.id}`);
    let result;
    let resultCourse;
    let cohortCustomized;
    if (cohort_id) {
      let lessonsID = [];
      let studentsID = [];

      resultCourse = await strapi.db.query('api::courses.course').findOne({
        where: { id: course },
        populate: ['lessons'],
      });

      result = await strapi.db.query('api::cohorts.cohort').findOne({
        where: { id: cohort_id, teachers: ctx.state.user.id },
        populate: ['students', 'course', 'lessons'],
      });

      if(resultCourse.lessons.length > 0){
        for(let i of resultCourse.lessons)
          lessonsID.push(i.id);
      }

      if(result.students.length > 0){
        for(let i of result.students){
          studentsID.push(i.id);
        }
      }

      cohortCustomized = {
          "cohort":result.id,
          "course_id": result.course.id,
          "lessons": lessonsID,
          "students": studentsID
      }

    }

    return cohortCustomized;
  }

}));
