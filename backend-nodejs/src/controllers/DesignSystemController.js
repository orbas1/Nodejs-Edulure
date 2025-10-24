import DesignSystemAssetService from '../services/DesignSystemAssetService.js';
import { success } from '../utils/httpResponse.js';

export default class DesignSystemController {
  static async describeAssets(_req, res, next) {
    try {
      const payload = await DesignSystemAssetService.describeAssets();
      return success(res, {
        data: payload,
        message: 'Design system assets resolved'
      });
    } catch (error) {
      return next(error);
    }
  }
}
