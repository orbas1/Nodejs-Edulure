import EnvironmentParityService from '../services/EnvironmentParityService.js';

class EnvironmentParityController {
  static async health(req, res, next) {
    try {
      const forceRefresh = typeof req?.query?.force === 'string'
        ? req.query.force.toLowerCase() === 'true'
        : false;
      const report = await EnvironmentParityService.generateReport({ forceRefresh });
      res.status(report.status === 'healthy' ? 200 : 503).json(report);
    } catch (error) {
      next(error);
    }
  }
}

export default EnvironmentParityController;
