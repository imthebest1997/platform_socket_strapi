'use strict';

/* eslint-disable no-useless-escape */
const crypto = require('crypto');
const _ = require('lodash');
const utils = require('@strapi/utils');
const { getService } = require('@strapi/plugin-users-permissions/server/utils');
const { difference, isEmpty } = require('lodash');
const { getAbsoluteAdminUrl, getAbsoluteServerUrl, sanitize } = utils;
const { ApplicationError, ValidationError } = utils.errors;

const emailRegExp =
  /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

const sanitizeUser = async (user, ctx) => {
  const { auth } = ctx.state;
  const userSchema = strapi.getModel('plugin::users-permissions.user');
  let userSanitize = await sanitize.contentAPI.output(user, userSchema, { auth });
  userSanitize.institution = user?.institution;
  userSanitize.profile_photo = user?.profile_photo;
  userSanitize.role = user?.role;
  return userSanitize;
};

const isHashed = (password) => {
  if (typeof password !== 'string' || !password) {
    return false;
  }
  return password.split('$').length >= 4;
};

const createRelationCourses = async (userId, courseId, months) => {
  const currentDate = new Date();
  strapi.log.debug(`Create or update data:{user: ${userId}, course: ${courseId}, in collection user-courses`);
  const results = await strapi.db.query('api::user-courses.user-course').findOne({
    where: { user_id: userId, course_id: courseId, cohort_id: null },
  });
  if (!results) {
    await strapi.service('api::user-courses.user-course').create({
      data: {
        course_id: courseId,
        user_id: userId,
        active: true,
        expiration_date: new Date(currentDate.setMonth(currentDate.getMonth() + months)),
      },
    });
  } else {
    await strapi.service('api::user-courses.user-course').update(results.id, {
      data: { active: true, expiration_date: new Date(currentDate.setMonth(currentDate.getMonth() + months)) },
    });
  }
};

const getRandomInt = (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
};

module.exports = (plugin) => {
  plugin.controllers.user.me = async (ctx) => {
    const { id, email } = ctx.state?.user;
    const provider = ctx.params.provider || 'local';

    strapi.log.debug({ user: { id: id, email: email } }, `users me with email '${email}'`);

    const user = await strapi.query('plugin::users-permissions.user').findOne({
      where: {
        provider,
        id: id,
      },
      populate: {
        role: { select: ['id'] },
        institution: { select: ['id', 'name'] },
        profile_photo: { select: ['id', 'name', 'url'] },
      },
    });
    return ctx.send({
      user: await sanitizeUser(user, ctx),
    });
  };

  plugin.controllers.user.updateRedeemCode = async (ctx) => {
    const users = await strapi.query('plugin::users-permissions.user').findMany();
    for (const user of users) {
      let redeemCode = false;
      const isRedeemCode = await strapi.db.query('api::book-codes.book-code').findMany({
        where: { activated_by: user.id },
      });
      if (!isEmpty(isRedeemCode)) {
        redeemCode = true;
      }
      await getService('user').edit(user.id, {
        redeem_code: redeemCode,
      });
    }
    return ctx.send({
      message: 'users update redeem_code attribute with success',
    });
  };

  plugin.controllers.user.registerUsers = async (ctx) => {
    const { users, role } = ctx.request.body;
    const provider = ctx.params?.provider || 'local';
    let userRegister = [], userEdit = [], failedCreate = [],
      usersId = [];
    let userRole = role == 'students' ? 1 : 3;
    let cohort;
    for (const user of users) {
      const { name, email } = user;
      cohort = user?.cohort;
      let monts = user?.expiration_months || 11;
      const userData = await strapi.query('plugin::users-permissions.user').findOne({
        where: {
          provider,
          $or: [{ email: email.toLowerCase() }, { dni: user.dni.toString() }],
        },
      });
      let created = false;
      let emailUser = email;
      if (userData) {
        if (user.dni.toString() !== userData.dni.toString()) {
          if (userData.name !== user.name && userData.last_name !== user.last_name) {
            var index = emailUser.lastIndexOf('@') + 1;
            const mailServer = emailUser.substr(index);
            const userName = emailUser.substring(0, index - 1);
            const randomInt = getRandomInt(1, 200);
            emailUser = `${userName}+${randomInt}@${mailServer}`;
            created = true;
          }
        }
      } else {
        created = true;
      }
      if (!created) {
        userEdit.push({ id: userData.id,dni: userData.dni, email: emailUser, name: userData.name, last_name: userData.last_name});
        usersId.push(userData.id);
        if (user?.courses) {
          let coursesData = user.courses.toString();
          const courses = coursesData.split(',');
          for (let course of courses) {
            course = parseInt(course);
            await createRelationCourses(userData.id, course, monts);
          }
        }
        await getService('user').edit(userData.id, {
          blocked: false,
          institution: user?.institution,
        });
      } else {
        const newUserData = {
          email: emailUser,
          password: user?.password ? `${user.password}` : '123456',
          name,
          last_name: user?.last_name || '',
          institution: user?.institution,
          provider,
          dni: user.dni.toString(),
          username: emailUser,
          role: userRole,
        };
        try {
          const newUser = await getService('user').add(newUserData);
          userRegister.push({ id: newUser.id, dni: newUserData.dni, email: newUserData.email, name: name, last_name: newUserData.last_name });
          usersId.push(newUser.id);
          if (user?.courses) {
            let coursesData = user.courses.toString();
            const courses = coursesData.split(',');
            for (let course of courses) {
              course = parseInt(course);
              await createRelationCourses(newUser.id, course, monts);
            }
          }
        } catch (err) {
          const { message } = err.details.errors[0];
          let error = `Se presento un error al crear el usuario ${email}`;
          if (message.includes('10')) {
            error = `${error}, el DNI del usuario no puede superar los 10 carácteres`;
          } else if (message.includes('must')) {
            error = `${error}, el DNI del usuario ya se encuentra utilizado`;
          } else if (message.includes('institutions')) {
            error = `${error}, No se encontró un registro para la institución con id = ${user?.institution}, por favor verifique el id de la institución y vuelve a intentarlo`;
          } else {
            error =
              '❗ Se presentó un error inesperado, por favor, compruebe el formato del Excel y vuelva a intentarlo, si el error continua por favor contactar con info@roboticawolf.com!';
          }
          failedCreate.push({ id: null, dni: newUserData.dni, email: emailUser, name, last_name: newUserData.last_name, error  });
          //throw new ValidationError(error);
        }
      }
    }
    if (cohort) {
      const cohortData = await strapi.db.query('api::cohorts.cohort').findOne({
        where: { id: cohort },
        populate: ['students', 'teachers'],
      });
      if (!cohortData) {
        for (let userData of userRegister) {
          userData.cohortStatus = `No se encontarón datos para el cohort id = ${cohort}, por favor verifique el id del cohort y vuelve a intentarlo`;
        }
        for (let userData of userEdit) {
          userData.cohortStatus = `No se encontarón datos para el cohort id = ${cohort}, por favor verifique el id del cohort y vuelve a intentarlo`;
        }
      } else if (userRole == 1) {
        const idStudents = cohortData?.students.map((student) => student.id);
        const studentRegister = difference(usersId, idStudents);
        await strapi.service('api::cohorts.cohort').update(cohort, {
          data: {
            students: [].concat(idStudents, studentRegister),
            active: true,
            teachers: [],
            end_date: cohortData?.end_date,
          },
        });
        for (let userData of userRegister) {
          userData.cohortStatus = `Estudiante con id ${userData.id}, fué registrado con éxito para el cohort id = ${cohort}`;
        }
        for (let userData of userEdit) {
          userData.cohortStatus = `Estudiante con id ${userData.id}, fué registrado con éxito para el cohort id = ${cohort}`;
        }
      } else {
        const idTeachers = cohortData?.teachers.map((student) => student.id);
        const teacherRegister = difference(usersId, idTeachers);
        await strapi.service('api::cohorts.cohort').update(cohort, {
          data: {
            teachers: [].concat(idTeachers, teacherRegister),
            active: true,
            students: [],
            end_date: cohortData?.end_date,
          },
        });
        for (let userData of userRegister) {
          userData.cohortStatus = `Docente con id ${userData.id}, fué registrado con éxito para el cohort id = ${cohort}`;
        }
        for (let userData of userEdit) {
          userData.cohortStatus = `Docente con id ${userData.id}, fué registrado con éxito para el cohort id = ${cohort}`;
        }
      }
    } else {
      for (let userData of userRegister) {
        userData.cohortStatus = null;
      }
      for (let userData of userEdit) {
        userData.cohortStatus = null;
      }
    }
    return { userRegister: userRegister, userEdit: userEdit, failedCreate: failedCreate };
  };

  plugin.controllers.auth.callback = async (ctx) => {
    const provider = ctx.params.provider || 'local';
    const params = ctx.request.body;
    strapi.log.debug({ email: params?.identifier }, `Auth callback with email '${params?.identifier}'`);

    const store = strapi.store({ type: 'plugin', name: 'users-permissions' });
    const grantSettings = await store.get({ key: 'grant' });

    const grantProvider = provider === 'local' ? 'email' : provider;

    if (!_.get(grantSettings, [grantProvider, 'enabled'])) {
      strapi.log.error({ email: params?.identifier }, 'Email provider not enabled');
      throw new ApplicationError('Este proveedor de autenticación está deshabilitado');
    }

    if (provider === 'local') {
      // We use our own validations
      // await validateCallbackBody(params);

      // The identifier is required.
      if (!params.identifier) {
        strapi.log.debug({ email: params?.identifier }, 'Email is mandatory');
        throw new ValidationError('El correo electrónico o DNI (Cédula o Passaporte) es obligatorio');
      }

      // The password is required.
      if (!params.password) {
        strapi.log.debug({ email: params?.identifier }, 'Password is mandatory');
        throw new ValidationError('La contraseña es obligatoria');
      }

      const { identifier } = params;

      // Check if the user exists.
      const user = await strapi.query('plugin::users-permissions.user').findOne({
        where: {
          provider,
          $or: [{ email: identifier.toLowerCase() }, { username: identifier }, { dni: identifier }],
        },
        populate: {
          role: { select: ['id'] },
          institution: { select: ['id', 'name'] },
          profile_photo: { select: ['id', 'name', 'url'] },
        },
      });

      if (!user || !user.password) {
        strapi.log.debug({ email: params?.identifier }, `No user found for email: ${params.identifier}`);
        throw new ValidationError('🔎 Revise el correo electrónico y la contraseña, no se encontró ningún usuario.');
      }

      const validPassword = await getService('user').validatePassword(params.password, user.password);

      if (!validPassword) {
        throw new ValidationError('🔎 Revise el correo electrónico y la contraseña, no se encontró ningún usuario.');
      }

      const advancedSettings = await store.get({ key: 'advanced' });
      const requiresConfirmation = _.get(advancedSettings, 'email_confirmation');

      if (requiresConfirmation && user.confirmed !== true) {
        throw new ApplicationError('Su cuenta de correo electrónico no ha sido confirmada.');
      }

      if (user.blocked === true) {
        throw new ApplicationError('Su cuenta se encuentra bloqueada. Comuníquese con soporte si es un error.');
      }

      return ctx.send({
        jwt: getService('jwt').issue({
          id: user.id,
          email: user.email,
        }),
        user: await sanitizeUser(user, ctx),
      });
    }

    // Connect the user with the third-party provider.
    try {
      const user = await getService('providers').connect(provider, ctx.query);
      return ctx.send({
        jwt: getService('jwt').issue({
          id: user.id,
          email: user.email,
        }),
        user: await sanitizeUser(user, ctx),
      });
    } catch (error) {
      throw new ApplicationError(error.message);
    }
  };

  plugin.controllers.auth.resetPassword = async (ctx) => {
    // const { password, passwordConfirmation, code } = await validateResetPasswordBody(ctx.request.body);
    const { password, passwordConfirmation, code } = _.assign({}, ctx.request.body, ctx.params);

    if (!password || !passwordConfirmation || !code) {
      throw new ValidationError('No se enviaron todos los parámetros');
    }

    if (password !== passwordConfirmation) {
      throw new ValidationError('Las contraseñas no coinciden');
    }

    const user = await strapi.query('plugin::users-permissions.user').findOne({ where: { resetPasswordToken: code } });

    if (!user) {
      throw new ValidationError('Código inválido');
    }

    await getService('user').edit(user.id, {
      resetPasswordToken: null,
      password,
    });

    // Update the user.
    ctx.send({
      jwt: getService('jwt').issue({
        id: user.id,
        email: user.email,
      }),
      user: await sanitizeUser(user, ctx),
    });
  };

  plugin.controllers.auth.connect = async (ctx, next) => {
    const grant = require('grant-koa');

    const providers = await strapi.store({ type: 'plugin', name: 'users-permissions', key: 'grant' }).get();
    const apiPrefix = strapi.config.get('api.rest.prefix');
    const grantConfig = {
      defaults: {
        prefix: `${apiPrefix}/connect`,
      },
      ...providers,
    };

    const [requestPath] = ctx.request.url.split('?');
    const provider = requestPath.split('/connect/')[1].split('/')[0];

    if (!_.get(grantConfig[provider], 'enabled')) {
      throw new ApplicationError('El proveedor está deshabilitado');
    }

    if (!strapi.config.server.url.startsWith('http')) {
      strapi.log.warn(
        'You are using a third party provider for login. Make sure to set an absolute url in config/server.js. More info here: https://docs.strapi.io/developer-docs/latest/plugins/users-permissions.html#setting-up-the-server-url'
      );
    }

    // Ability to pass OAuth callback dynamically
    grantConfig[provider].callback =
      _.get(ctx, 'query.callback') || _.get(ctx, 'session.grant.dynamic.callback') || grantConfig[provider].callback;
    grantConfig[provider].redirect_uri = getService('providers').buildRedirectUri(provider);

    return grant(grantConfig)(ctx, next);
  };

  plugin.controllers.auth.forgotPassword = async (ctx) => {
    // we do validations manually
    // const { email } = await validateForgotPasswordBody(ctx.request.body);
    let { email } = ctx.request.body;

    // Check if the provided email is valid or not.
    /*const isEmail = emailRegExp.test(email);

    if (!isEmail) {
      throw new ValidationError('Email inválido');
    }*/

    const pluginStore = await strapi.store({ type: 'plugin', name: 'users-permissions' });

    const emailSettings = await pluginStore.get({ key: 'email' });
    const advancedSettings = await pluginStore.get({ key: 'advanced' });

    // Find the user by email.
    //const user = await strapi.query('plugin::users-permissions.user').findOne({ where: { email: email.toLowerCase() } });
    const user = await strapi.query('plugin::users-permissions.user').findOne({
      where: {
        $or: [
          {
            email: email.toLowerCase(),
          },
          {
            dni: email,
          },
        ],
      },
    });

    if (!user || user.blocked) {
      return ctx.send({ ok: true });
    }

    // Generate random token.
    const userInfo = await sanitizeUser(user, ctx);

    const resetPasswordToken = crypto.randomBytes(64).toString('hex');

    const resetPasswordSettings = _.get(emailSettings, 'reset_password.options', {});

    const emailBody = await getService('users-permissions').template(resetPasswordSettings.message, {
      URL: advancedSettings.email_reset_password,
      SERVER_URL: getAbsoluteServerUrl(strapi.config),
      ADMIN_URL: getAbsoluteAdminUrl(strapi.config),
      USER: userInfo,
      TOKEN: resetPasswordToken,
    });

    const emailObject = await getService('users-permissions').template(resetPasswordSettings.object, {
      USER: userInfo,
    });

    const emailToSend = {
      to: user.email,
      from:
        resetPasswordSettings.from.email || resetPasswordSettings.from.name
          ? `${resetPasswordSettings.from.name} <${resetPasswordSettings.from.email}>`
          : undefined,
      replyTo: resetPasswordSettings.response_email,
      subject: emailObject,
      text: emailBody,
      html: emailBody,
    };

    try {
      // NOTE: Update the user before sending the email so an Admin can generate the link if the email fails
      await getService('user').edit(user.id, { resetPasswordToken });

      // Send email to the user.
      await strapi.plugin('email').service('email').send(emailToSend);
    } catch (err) {
      throw new ApplicationError('Error al enviar el email');
    }

    ctx.send({ email: user.email });
  };

  plugin.controllers.auth.register = async (ctx) => {
    strapi.log.debug(
      {
        data: {
          name: ctx.request.body?.name,
          last_name: ctx.request.body?.last_name,
          email: ctx.request.body?.email,
          dni: ctx.request.body?.dni,
        },
      },
      `Register call received for email '${ctx.request.body?.email}'`
    );

    const pluginStore = await strapi.store({
      type: 'plugin',
      name: 'users-permissions',
    });

    const settings = await pluginStore.get({
      key: 'advanced',
    });

    if (!settings.allow_register) {
      strapi.log.warn(
        {
          data: {
            name: ctx.request.body?.name,
            last_name: ctx.request.body?.last_name,
            email: ctx.request.body?.email,
            dni: ctx.request.body?.dni,
          },
        },
        'User register is disabled'
      );

      throw new ApplicationError('El registro de nuevos usuarios no se encuentra habilitado');
    }
    const params = {
      ..._.omit(ctx.request.body, ['confirmed', 'blocked', 'confirmationToken', 'resetPasswordToken', 'provider']),
      provider: 'local',
    };

    // Comment automatic validations, add our own
    // await validateRegisterBody(params);

    // Password is required.
    if (!params.password) {
      strapi.log.debug(
        {
          data: {
            name: ctx.request.body?.name,
            last_name: ctx.request.body?.last_name,
            email: ctx.request.body?.email,
            dni: ctx.request.body?.dni,
          },
        },
        'Password is mandatory'
      );
      throw new ValidationError('La contraseña es obligatoria. Por favor ingrese una');
    }

    if (!params.dni) {
      strapi.log.debug(
        {
          data: {
            name: ctx.request.body?.name,
            last_name: ctx.request.body?.last_name,
            email: ctx.request.body?.email,
            dni: ctx.request.body?.dni,
          },
        },
        'dni is mandatory'
      );
      throw new ValidationError('La DNI (cédula o Passaporte) es obligatoria. Por favor ingrese una');
    }

    // Email is required.
    if (!params.email) {
      strapi.log.debug(
        {
          data: {
            name: ctx.request.body?.name,
            last_name: ctx.request.body?.last_name,
            email: ctx.request.body?.email,
            dni: ctx.request.body?.dni,
          },
        },
        'Email is mandatory'
      );
      throw new ValidationError('El email es obligatorio. Por favor ingrese uno');
    }

    if (!params.name) {
      strapi.log.debug(
        {
          data: {
            name: ctx.request.body?.name,
            last_name: ctx.request.body?.last_name,
            email: ctx.request.body?.email,
            dni: ctx.request.body?.dni,
          },
        },
        'Name is mandatory'
      );
      throw new ValidationError('El nombre es obligatorio. Por favor ingrese uno');
    }

    if (!params.last_name) {
      strapi.log.debug(
        {
          data: {
            name: ctx.request.body?.name,
            last_name: ctx.request.body?.last_name,
            email: ctx.request.body?.email,
            dni: ctx.request.body?.dni,
          },
        },
        'Last name is mandatory'
      );
      throw new ValidationError('El apellido es obligatorio. Por favor ingrese uno');
    }

    /*if (params.code && !params.institution) {
      strapi.log.debug(
        {
          data: {
            name: ctx.request.body?.name,
            last_name: ctx.request.body?.last_name,
            email: ctx.request.body?.email,
            dni: ctx.request.body?.dni,
          },
        },
        'Institution is mandatory'
      );
      throw new ValidationError('El institución es obligatoria. Por favor seleccione una');
    }*/

    /*if (!params.code) {
      throw new ValidationError('El código de libro es obligatorio. Por favor ingrese uno');
    }*/

    // Trim all the params after verifying there are present
    params.password = params.password.trim();
    params.confirmPassword = _.get(params, 'confirmPassword', '').trim();
    params.email = params.email.trim();
    params.confirmEmail = _.get(params, 'confirmEmail', '').trim();
    // For now the username is the same as the email
    params.username = params.email;
    params.name = params.name.trim();
    params.dni = params.dni.trim();
    params.last_name = params.last_name.trim();
    params.code = params.code?.trim?.();
    params.blocked = false;

    if (params.email !== params.confirmEmail) {
      strapi.log.debug(
        {
          data: {
            name: ctx.request.body?.name,
            last_name: ctx.request.body?.last_name,
            email: ctx.request.body?.email,
            dni: ctx.request.body?.dni,
          },
        },
        'Email and confirmation email are not identical'
      );
      throw new ValidationError('El correo electrónico ingresado y la confirmación no son iguales');
    }

    if (params.password !== params.confirmPassword) {
      strapi.log.debug(
        {
          data: {
            name: ctx.request.body?.name,
            last_name: ctx.request.body?.last_name,
            email: ctx.request.body?.email,
            dni: ctx.request.body?.dni,
          },
        },
        'Password and confirm password are not identical'
      );
      throw new ValidationError('La contraseña ingresada y la confirmación no son iguales');
    }

    // Throw an error if the password selected by the user
    // contains more than three times the symbol '$'.
    if (isHashed(params.password)) {
      strapi.log.debug(
        {
          data: {
            name: ctx.request.body?.name,
            last_name: ctx.request.body?.last_name,
            email: ctx.request.body?.email,
            dni: ctx.request.body?.dni,
          },
        },
        `Password can't have more than 3 '${'$'}' symbols`
      );
      throw new ValidationError('La contraseña no puede contener más de tres veces el símbolo `$`');
    }

    const role = await strapi.query('plugin::users-permissions.role').findOne({ where: { type: settings.default_role } });

    if (!role) {
      strapi.log.error(
        {
          data: {
            name: ctx.request.body?.name,
            last_name: ctx.request.body?.last_name,
            email: ctx.request.body?.email,
            dni: ctx.request.body?.dni,
          },
        },
        'Default role not found'
      );
      throw new ApplicationError('No se pudo encontrar el rol por defecto a asignar');
    }

    // Check if the provided email is valid or not.
    const isEmail = emailRegExp.test(params.email);

    if (isEmail) {
      params.email = params.email.toLowerCase();
    } else {
      strapi.log.debug(
        {
          data: {
            name: ctx.request.body?.name,
            last_name: ctx.request.body?.last_name,
            email: ctx.request.body?.email,
            dni: ctx.request.body?.dni,
          },
        },
        'Email is not valid'
      );
      throw new ValidationError('El correo electrónico no es válido. Por favor revíselo');
    }

    const { email, username, provider, dni } = params;

    const identifierFilter = {
      $or: [{ email: email.toLowerCase() }, { username: email.toLowerCase() }, { username }, { email: username }, { dni: dni }],
    };

    const conflictingUserCount = await strapi.query('plugin::users-permissions.user').count({
      where: { ...identifierFilter, provider },
    });

    if (conflictingUserCount > 0) {
      strapi.log.debug(
        {
          data: {
            name: ctx.request.body?.name,
            last_name: ctx.request.body?.last_name,
            email: ctx.request.body?.email,
            dni: ctx.request.body?.dni,
          },
        },
        `The email is already taken, email: '${params.email}, provider: '${params.provider}'`
      );
      const user = await strapi.query('plugin::users-permissions.user').findMany({
        where: {
          $or: [{ email: email.toLowerCase() }, { dni: dni }],
        },
      });

      if (user.length > 1) {
        throw new ApplicationError(
          'El correo electrónico ingresado y el DNI (Cédula o Passaporte) del usuario, ya ha sido usado antes, por favor modifique estos valores o inicie sesión en el apartado "ingresar"'
        );
      } else if (user[0].email === email.toLowerCase()) {
        throw new ApplicationError(
          'El correo electrónico ingresado, ya ha sido usado antes, por favor modifique este campo o inicie sesión en el apartado "ingresar"'
        );
      } else if (user[0].dni === dni) {
        throw new ApplicationError(
          'El DNI (Cédula o Passaporte) ingresado, ya ha sido usado antes, por favor modifique este campo o inicie sesión en el apartado "ingresar"'
        );
      } else {
        throw new ApplicationError('Se presentó un error, inesperado por favor comunicarse con info@roboticawolf.com');
      }
    }

    try {
      let bookCode;
      let courseFoundForCode;
      if (!_.isEmpty(params.code)) {
        strapi.log.debug(
          {
            data: {
              name: ctx.request.body?.name,
              last_name: ctx.request.body?.last_name,
              email: ctx.request.body?.email,
              dni: ctx.request.body?.dni,
            },
          },
          `Book code sent, trying to get the info for '${params.code}'`
        );
        bookCode = await strapi.db.query('api::book-codes.book-code').findOne({
          where: { code: params.code },
          //populate: ['activated_by'],
          populate: { activated_by: true, cohort: { populate: { institution: { select: ['id'] }, students: true } } },
        });

        if (_.isEmpty(bookCode)) {
          strapi.log.debug(
            {
              data: {
                name: ctx.request.body?.name,
                last_name: ctx.request.body?.last_name,
                email: ctx.request.body?.email,
                dni: ctx.request.body?.dni,
              },
            },
            'Book code sent is invalid'
          );
          throw new ValidationError(`El código de libro ${params.code} es inválido`);
        }

        if (!_.isNull(bookCode.activated_by)) {
          const { email, dni } = bookCode.activated_by;
          strapi.log.debug(
            {
              data: {
                name: ctx.request.body?.name,
                last_name: ctx.request.body?.last_name,
                email: ctx.request.body?.email,
                dni: ctx.request.body?.dni,
              },
            },
            'Book code sent, is already active'
          );
          throw new ValidationError(
            `El código de libro ${params.code} ya ha sido activado previamente por el usuario: Email: ${email} ${
              dni ? `, Dni: ${dni}` : '.'
            }`
          );
        }
        if (!bookCode?.cohort) {
          let courseSlugToSearch = await strapi.service('api::book-codes.book-code').getSlugCourse({ grade: bookCode.grade });
          courseFoundForCode = await strapi.db.query('api::courses.course').findOne({
            where: { slug: courseSlugToSearch, active: true },
          });
          if (!courseFoundForCode) {
            strapi.log.error(
              {
                data: {
                  name: ctx.request.body?.name,
                  last_name: ctx.request.body?.last_name,
                  email: ctx.request.body?.email,
                  dni: ctx.request.body?.dni,
                },
              },
              `Course not found for '${params.code}'`
            );
            throw new ValidationError('No se encontró el curso para asignar a este usuario.');
          }
        }
      }

      const newUser = {
        ...params,
        role: role.id,
        email: email.toLowerCase(),
        username,
        // confirmed: !settings.email_confirmation,
        confirmed: false,
      };

      const user = await getService('user').add(newUser);

      if (!_.isEmpty(params.code)) {
        // Will trigger user courses permission to give access to the user
        let data = { redeem_code: true };
        if (bookCode?.cohort) {
          data = { redeem_code: true, institution: bookCode.cohort.institution.id };
        } else {
          const institution = await strapi.service('api::book-codes.book-code').getInstitutionCourse({ grade: bookCode.grade });
          if (institution) {
            data = { redeem_code: true, institution: institution };
          }
        }
        await strapi.service('api::book-codes.book-code').update(bookCode.id, { data: { activated_by: user.id } });
        await getService('user').edit(user.id, data);
      }

      const sanitizedUser = await sanitizeUser(user, ctx);

      // if (settings.email_confirmation) {
      try {
        await getService('user').sendConfirmationEmail(sanitizedUser);
        strapi.log.debug(
          {
            data: {
              name: ctx.request.body?.name,
              last_name: ctx.request.body?.last_name,
              email: ctx.request.body?.email,
              dni: ctx.request.body?.dni,
            },
          },
          `Confirmation email sent to '${sanitizedUser.email}'`
        );
      } catch (err) {
        strapi.log.error(
          {
            data: {
              name: ctx.request.body?.name,
              last_name: ctx.request.body?.last_name,
              email: ctx.request.body?.email,
              dni: ctx.request.body?.dni,
            },
            err,
          },
          `Error sending email to '${sanitizedUser.email}'`
        );
        throw new ApplicationError('No se pudo enviar el email de confirmación, contacte a soporte.');
      }
      return ctx.send({ user: sanitizedUser });
      // }

      /**
       * ALL USERS MUST CONFIRM THEIR ACCOUNT, no need to continue
       */
      // const jwt = getService('jwt').issue(_.pick(user, ['id', 'email']));
      //
      // return ctx.send({
      //   jwt,
      //   user: sanitizedUser,
      // });
    } catch (err) {
      strapi.log.error(
        {
          data: {
            name: ctx.request.body?.name,
            last_name: ctx.request.body?.last_name,
            email: ctx.request.body?.email,
            dni: ctx.request.body?.dni,
          },
          err,
        },
        'Error while creating the user'
      );
      throw err;
    }
  };

  plugin.controllers.auth.emailConfirmation = async (ctx, returnUser) => {
    // const { confirmation: confirmationToken } = await validateEmailConfirmationBody(ctx.query);
    // We use our own validations
    const { confirmation: confirmationToken } = ctx.query;

    const userService = getService('user');

    if (_.isEmpty(confirmationToken)) {
      throw new ValidationError('Token de confirmación inválido');
    }

    const [user] = await userService.fetchAll({ filters: { confirmationToken } });

    if (!user) {
      // throw new ValidationError('Token de confirmación inválido');
      return ctx.redirect(`${process.env.URL ?? ''}/?token-invalido=si`);
    }

    await userService.edit(user.id, { confirmed: true, confirmationToken: null });

    if (returnUser) {
      return ctx.redirect(`${process.env.URL ?? ''}/?cuenta-confirmada=si`);
    } else {
      const settings = await strapi
        .store({
          type: 'plugin',
          name: 'users-permissions',
          key: 'advanced',
        })
        .get();

      return ctx.redirect(settings.email_confirmation_redirection || '/');
    }
  };

  plugin.controllers.auth.sendEmailConfirmation = async (ctx) => {
    // const { email } = await validateSendEmailConfirmationBody(ctx.request.body);
    // Use our own validations
    let { email } = ctx.request.body;

    const user = await strapi.query('plugin::users-permissions.user').findOne({
      where: { email: email.toLowerCase().trim() },
    });

    const isEmail = emailRegExp.test(email);

    if (isEmail) {
      email = email.toLowerCase();
    } else {
      throw new ValidationError('El correo electrónico es inválido');
    }

    if (!user) {
      return ctx.send({ email, sent: true });
    }

    if (user.confirmed) {
      throw new ApplicationError('El correo electrónico ya fue confirmado');
    }

    if (user.blocked) {
      throw new ApplicationError('El usuario se encuentra bloqueado');
    }

    try {
      await getService('user').sendConfirmationEmail(user);
    } catch (err) {
      throw new ApplicationError('No se pudo enviar el correo electrónico de confirmación');
    }

    ctx.send({
      email: user.email,
      sent: true,
    });
  };

  // create route for new endPoint
  plugin.routes['content-api'].routes.push({
    method: 'PUT',
    path: '/users/registerUsers',
    handler: 'user.registerUsers',
    prefix: '',
    config: {
      policies: ['global::is-admin'],
    },
  });

  plugin.routes['content-api'].routes.push({
    method: 'PUT',
    path: '/users/updateRedeemCode',
    handler: 'user.updateRedeemCode',
    prefix: '',
  });

  return plugin;
};
