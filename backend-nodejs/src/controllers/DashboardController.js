import DashboardService from '../services/DashboardService.js';
import { success } from '../utils/httpResponse.js';

export default class DashboardController {
  static async current(req, res, next) {
    try {
      const dashboard = await DashboardService.getDashboardForUser(req.user.id);
      return success(res, {
        data: dashboard,
        message: 'Dashboard resolved'
      });
    } catch (error) {
      return next(error);
    }
  }
}
