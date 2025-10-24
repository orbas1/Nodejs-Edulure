import StrategyBriefingService from '../services/StrategyBriefingService.js';
import { success } from '../utils/httpResponse.js';

function extractRole(value) {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  return trimmed.length ? trimmed : null;
}

export default class StrategyBriefingController {
  static async describe(req, res, next) {
    try {
      const role = extractRole(req.query.role);
      const briefing = await StrategyBriefingService.getBriefing({ role });
      return success(res, {
        data: briefing,
        message: 'Strategy briefing resolved'
      });
    } catch (error) {
      return next(error);
    }
  }
}
