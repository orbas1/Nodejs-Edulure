import LearningOfflineService from '../services/LearningOfflineService.js';

function requireUserId(req) {
  if (!req?.user?.id) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }
  return req.user.id;
}

export default class MobileLearningController {
  static async snapshot(req, res, next) {
    try {
      const userId = requireUserId(req);
      const snapshot = await LearningOfflineService.getSnapshot(userId);
      return res.json({ success: true, ...snapshot });
    } catch (error) {
      return next(error);
    }
  }

  static async recordDownload(req, res, next) {
    try {
      const userId = requireUserId(req);
      const download = await LearningOfflineService.recordDownload(userId, req.body ?? {});
      return res.status(201).json({ success: true, download });
    } catch (error) {
      return next(error);
    }
  }

  static async updateDownload(req, res, next) {
    try {
      const userId = requireUserId(req);
      const download = await LearningOfflineService.updateDownload(userId, req.params.assetId, req.body ?? {});
      return res.json({ success: true, download });
    } catch (error) {
      return next(error);
    }
  }

  static async queueAssessment(req, res, next) {
    try {
      const userId = requireUserId(req);
      const assessment = await LearningOfflineService.queueAssessment(userId, req.body ?? {});
      return res.status(201).json({ success: true, assessment });
    } catch (error) {
      return next(error);
    }
  }

  static async updateAssessment(req, res, next) {
    try {
      const userId = requireUserId(req);
      const assessment = await LearningOfflineService.updateAssessment(
        userId,
        req.params.submissionId,
        req.body ?? {}
      );
      return res.json({ success: true, assessment });
    } catch (error) {
      return next(error);
    }
  }

  static async recordModuleSnapshot(req, res, next) {
    try {
      const userId = requireUserId(req);
      const snapshot = await LearningOfflineService.recordModuleSnapshot(userId, req.body ?? {});
      return res.status(201).json({ success: true, snapshot });
    } catch (error) {
      return next(error);
    }
  }
}
