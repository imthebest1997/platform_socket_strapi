'use strict';

/**
 * book-codes service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::book-codes.book-code', () => ({
  async getSlugCourse(ctx) {
    const { grade } = ctx;
    let courseSlugToSearch;
    switch (grade) {
      case 0:
        courseSlugToSearch = 'inicial-2';
        break;
      case 1:
        courseSlugToSearch = 'primero-egb';
        break;
      case 2:
        courseSlugToSearch = 'segundo-egb';
        break;
      case 3:
        courseSlugToSearch = 'tercero-egb';
        break;
      case 4:
        courseSlugToSearch = 'cuarto-egb';
        break;
      case 5:
        courseSlugToSearch = 'quinto-egb';
        break;
      case 6:
        courseSlugToSearch = 'sexto-egb';
        break;
      case 7:
        courseSlugToSearch = 'septimo-egb';
        break;
      case 8:
        courseSlugToSearch = 'octavo-egb';
        break;
      case 9:
        courseSlugToSearch = 'noveno-egb';
        break;
      case 10:
        courseSlugToSearch = 'decimo-egb';
        break;
      case 11:
        courseSlugToSearch = 'primero-bachillerato';
        break;
      case 12:
        courseSlugToSearch = 'segundo-bachillerato';
        break;
      case 13:
        courseSlugToSearch = 'tercero-bachillerato';
        break;
      case 14:
        courseSlugToSearch = 'inicial-2-foundation';
        break;
      case 15:
        courseSlugToSearch = 'primero-egb-foundation';
        break;
      case 16:
        courseSlugToSearch = 'segundo-egb-foundation';
        break;
      case 17:
        courseSlugToSearch = 'tercero-egb-foundation';
        break;
      case 18:
        courseSlugToSearch = 'cuarto-egb-foundation';
        break;
      case 19:
        courseSlugToSearch = 'quinto-egb-foundation';
        break;
      case 20:
        courseSlugToSearch = 'sexto-egb-foundation';
        break;
      case 21:
        courseSlugToSearch = 'septimo-egb-foundation';
        break;
      case 22:
        courseSlugToSearch = 'octavo-egb-foundation';
        break;
      case 23:
        courseSlugToSearch = 'noveno-egb-foundation';
        break;
      case 24:
        courseSlugToSearch = 'decimo-egb-foundation';
        break;
      case 25:
        courseSlugToSearch = '1ro-bachillerato-F';
        break;
      case 26:
        courseSlugToSearch = '2do-bachillerato-F';
        break;
      case 27:
        courseSlugToSearch = '3ro-bachillerato-F';
        break;
      case 50:
        courseSlugToSearch = 'segundo-basic-618';
        break;
      case 51:
        courseSlugToSearch = 'tercero-basic-619';
        break;
      case 52:
        courseSlugToSearch = 'cuarto-basic-620';
        break;
      case 53:
        courseSlugToSearch = 'quinto-basic-621';
        break;
      case 54:
        courseSlugToSearch = 'sexto-basic-791';
        break;
      case 55:
        courseSlugToSearch = 'septimo-basic-792';
        break;
      case 56:
        courseSlugToSearch = 'octavo-basic-793';
        break;
      case 57:
        courseSlugToSearch = 'noveno-basic-625';
        break;
      case 58:
        courseSlugToSearch = 'decimo-basic-626';
        break;
      case 59:
        courseSlugToSearch = '1BA-basic-627';
        break;
      case 60:
        courseSlugToSearch = '2BA-basic-628';
        break;
      case 61:
        courseSlugToSearch = '3BA-basic-629';
        break;
      case 70:
        courseSlugToSearch = 'inicial-2-631';
        break;
      case 71:
        courseSlugToSearch = 'primero-egb-630';
        break;
      case 72:
        courseSlugToSearch = 'segundo-egb-632';
        break;
      case 73:
        courseSlugToSearch = 'tercero-egb-634';
        break;
      case 74:
        courseSlugToSearch = 'cuarto-egb-633';
        break;
      case 75:
        courseSlugToSearch = 'quinto-egb-635';
        break;
      case 76:
        courseSlugToSearch = 'sexto-egb-636';
        break;
      case 77:
        courseSlugToSearch = 'septimo-egb-637';
        break;
      case 78:
        courseSlugToSearch = 'octavo-egb-638';
        break;
      case 79:
        courseSlugToSearch = 'noveno-egb-639';
        break;
      case 80:
        courseSlugToSearch = 'decimo-egb-640';
        break;
      case 81:
        courseSlugToSearch = 'primero-bachillerato-641';
        break;
      case 82:
        courseSlugToSearch = 'segundo-bachillerato-642';
        break;
      case 83:
        courseSlugToSearch = 'tercero-bachillerato-643';
        break;
      case 90:
        courseSlugToSearch = 'inicial-2-647';
        break;
      case 91:
        courseSlugToSearch = 'primero-egb-648';
        break;
      case 92:
        courseSlugToSearch = 'segundo-egb-649';
        break;
      case 93:
        courseSlugToSearch = 'tercero-egb-650';
        break;
      case 94:
        courseSlugToSearch = 'cuarto-egb-651';
        break;
      case 95:
        courseSlugToSearch = 'quinto-egb-652';
        break;
      case 96:
        courseSlugToSearch = 'sexto-egb-653';
        break;
      case 97:
        courseSlugToSearch = 'septimo-egb-654';
        break;
      case 98:
        courseSlugToSearch = 'octavo-egb-655';
        break;
      case 99:
        courseSlugToSearch = 'noveno-egb-656';
        break;
      case 100:
        courseSlugToSearch = 'decimo-egb-657';
        break;
      case 101:
        courseSlugToSearch = 'primero-bachillerato-658';
        break;
      case 102:
        courseSlugToSearch = 'segundo-bachillerato-659';
        break;
    }
    return courseSlugToSearch;
  },
  async getInstitutionCourse(ctx) {
    const { grade } = ctx;
    const slug = await strapi.service('api::book-codes.book-code').getSlugCourse({ grade: grade });
    const cohortData = await strapi.db.query('api::cohorts.cohort').findOne({
      where: { course: { slug: slug } },
      populate: { institution: { select: ['id'] } },
    });
    if (!cohortData || !cohortData?.institution) {
      return null;
    }

    return cohortData.institution.id;
  },
}));
