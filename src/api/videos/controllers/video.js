'use strict';
const uui = require('uuid');
const fs = require('node:fs');
const { rimraf } = require('rimraf');
const axios = require('axios');
const tus = require('tus-js-client');

/**
 *  videos controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

const sendRegistrationConfirmationEmail = async (user, status, data) => {
  const { name, last_name, email } = user;
  const emailTemplate = {
    subject: `Confirmación subida de video: ${data.name}`,
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
                  <img style="padding: 0 0 15px 0; display: block" src="https://roboticawolf.com/assets/logo.aee7179e.png" width="100%">
                </td>
              </tr>
              <tr>
                <td style="background-color: #ecf0f1; padding-top: 15px; border-radius: 15px;">
                  <div style="color: #34495e; margin: 4% 10% 2%; text-align: justify;font-family: sans-serif">
                    <h2 style="color: #e67e22;">Hola ${name} ${last_name}!</h2>
                    <p style="margin: 2px; font-size: 15px">
                    El proceso solicitado, para subir el video con nombre ${data?.name
      }, ha finalizado con ${status}, para mayor información ver la siguiente tabla. </p>
                    <p>Información del proceso. </p>
                    <div style="style="max-width: 800px;">
                        <table id="customers">
                          <tr>
                            <th>Id</th>
                            <th>Nombre</th>
                            <th>Src</th>
                            <th>Estatus</th>
                          </tr>
                            <tr>
                            <td>${data.id}</td>
                            <td>${data.name}</td>
                            <td>${data.src_video}</td>
                            <td>${status}</td>
                            </tr>
                        </table>
                  </div>
                  <p>Para incorporar o relacionar este video con una clase, por favor copia y pega el siguiente comando en el contenido de la clase: </p>
                  <p style="
                  text-align: -webkit-center;
                  background-color: lightgrey;
                  padding: 1rem;
                  "> &#60;Video id="${data.id}"/&#62;</p>
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
  strapi.log.debug(`Message successfullly sent to ${email}`);
  await strapi.plugins['email'].services.email.sendTemplatedEmail(
    {
      to: 'info@roboticawolf.com',
    },
    emailTemplate
  );
  strapi.log.debug('Message successfullly sent to info@roboticawolf.com');
};

module.exports = createCoreController('api::videos.video', ({ strapi }) => ({
  async uploadVimeo(ctx) {
    const { name } = ctx.request.body;
    const { video } = ctx.request.files;
    const pathFile = video.path;
    var file = fs.createReadStream(pathFile);
    var size = fs.statSync(pathFile).size;
    strapi.log.debug(`Url temp video: ${pathFile}`);
    var options = {
      endpoint: `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_API_CLIENT_ID}/stream`,
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_ACCESS_TOKEN}`,
        'Tus-Max-Size': '1024',
        'Access-Control-Allow-Origin': '*',
      },
      chunkSize: 10 * 1024 * 1024, // Cloudflare Stream requires a minimum chunk size of 5MB.
      metadata: {
        filename: `${video.name}`,
        filetype: 'video/mp4',
        allowedorigins: ['dev.roboticawolf.com', 'roboticawolf.com'],
        name: name,
      },
      uploadSize: size,
      onError: function(error) {
        strapi.log.error(`Failed upload video because: ${error}`);
        return error;
      },
      onProgress: function(bytesUploaded, bytesTotal) {
        var percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
        strapi.log.debug(
          `Uploading video ${name}, bytes total: ${bytesTotal}, bytes uploaded: ${bytesUploaded}, percentage: ${percentage}%`
        );
      },
      onSuccess: function() {
        strapi.log.debug(`Uploading video ${name}, with exit`);
        var index = upload.url.lastIndexOf('/') + 1;
        var mediaId = upload.url.substr(index);
        var search = mediaId.split('?')[0];
        const options = {
          method: 'GET',
          url: `https://api.cloudflare.com/client/v4/accounts/78dcf32d2fce1c1b85aff4110cf68f8d/stream?search=${search}`,
          crossdomain: true,
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Email': '',
            'Access-Control-Allow-Origin': '*',
            Authorization: 'Bearer 53OwQPOU76ytimO27nOfeiVNqYWiscFx0c-PGS6L',
          },
        };

        axios
          .request(options)
          .then(async function(response) {
            const {
              playback: { hls, dash },
            } = response.data.result[0];
            const id = uui.v4();
            const src = name?.replace(/ /g, '-')?.substring(0, 46);
            const videoData = await strapi.service('api::videos.video').create({
              data: {
                active: true,
                src_video: `${src}.mp4`,
                dash_url: dash,
                hls_url: hls,
                name: name,
                guid: id,
                provider: 'cloudflare',
              },
            });
            await sendRegistrationConfirmationEmail(ctx.state.user, 'éxito', videoData);
            rimraf(pathFile, []).then(() => {
              strapi.log.debug(
                `Deleting video ${name}, with exit`
              );
            }).catch(err => strapi.log.error(`Failed delete video ${name} because: ${err}`));
          })
          .catch(function(error) {
            console.error(error);
          });
      },
    };

    var upload = new tus.Upload(file, options);
    upload.start();
    ctx.send({
      message: 'With exit',
    });
  },
}));
