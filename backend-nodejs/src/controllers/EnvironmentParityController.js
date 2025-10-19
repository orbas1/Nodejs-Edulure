import EnvironmentParityService from '../services/EnvironmentParityService.js';

class EnvironmentParityController {
  static async health(req, res, next) {
    try {
      const report = await EnvironmentParityService.generateReport();
      res.status(report.status === 'healthy' ? 200 : 503).json(report);
    } catch (error) {
      next(error);
    }
  }
}

export default EnvironmentParityController;
