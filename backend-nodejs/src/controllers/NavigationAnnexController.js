import NavigationAnnexService from '../services/NavigationAnnexService.js';
import { success } from '../utils/httpResponse.js';

function extractRole(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  return trimmed.length ? trimmed : null;
}

export default class NavigationAnnexController {
  static async describe(req, res, next) {
    try {
      const role = extractRole(req.query.role);
      const annex = await NavigationAnnexService.describeAnnex({ role });
      return success(res, {
        data: annex,
        message: 'Navigation annex resolved'
      });
    } catch (error) {
      return next(error);
    }
  }
}
