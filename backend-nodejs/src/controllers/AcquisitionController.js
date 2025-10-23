import { success } from '../utils/httpResponse.js';
import AcquisitionService from '../services/AcquisitionService.js';

export default class AcquisitionController {
  static async listPlans(req, res, next) {
    try {
      const payload = await AcquisitionService.listPlansWithAddons();
      return success(res, { data: payload, message: 'Acquisition plans loaded' });
    } catch (error) {
      return next(error);
    }
  }
}
