"use strict";

/**
 * https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/optional/cronjobs.html
 */

//"0 */24 * * */7" -> For 7 days
//"0 0 */15 * *" -> For 15 days

module.exports = {
  "0 0 */15 * *":
    async ({ strapi }) => {
      const now = new Date();
      now.setDate(now.getDate() - 14);

      await strapi.db
        .query("api::notification.notification")
        .deleteMany({
          where: {
            createdAt: {
              $lte: now,
            },
          },
        }
      );
    }
};
