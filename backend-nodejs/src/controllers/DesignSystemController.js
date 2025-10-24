import DesignSystemService from '../services/DesignSystemService.js';
import { success } from '../utils/httpResponse.js';

export default class DesignSystemController {
  static async describe(req, res, next) {
    try {
      const manifest = await DesignSystemService.describeTokens();
      return success(res, {
        data: manifest,
        message: 'Design system tokens resolved'
      });
    } catch (error) {
      return next(error);
    }
  }
}
