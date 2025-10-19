import LearnerDashboardService from '../services/LearnerDashboardService.js';
import { success } from '../utils/httpResponse.js';

export default class LearnerDashboardController {
  static async createTutorBooking(req, res, next) {
    try {
      const acknowledgement = await LearnerDashboardService.createTutorBookingRequest(req.user.id, req.body);
      return success(res, {
        data: acknowledgement,
        message: 'Tutor booking request created'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async exportTutorSchedule(req, res, next) {
    try {
      const acknowledgement = await LearnerDashboardService.exportTutorSchedule(req.user.id);
      return success(res, {
        data: acknowledgement,
        message: 'Tutor schedule export ready'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async createCourseGoal(req, res, next) {
    try {
      const { courseId } = req.params;
      const acknowledgement = await LearnerDashboardService.createCourseGoal(req.user.id, courseId, req.body);
      return success(res, {
        data: acknowledgement,
        message: 'Learning goal created'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async resumeEbook(req, res, next) {
    try {
      const { ebookId } = req.params;
      const acknowledgement = await LearnerDashboardService.resumeEbook(req.user.id, ebookId);
      return success(res, {
        data: acknowledgement,
        message: 'E-book resumed'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async shareEbook(req, res, next) {
    try {
      const { ebookId } = req.params;
      const acknowledgement = await LearnerDashboardService.shareEbook(req.user.id, ebookId, req.body);
      return success(res, {
        data: acknowledgement,
        message: 'E-book highlight shared'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async downloadInvoice(req, res, next) {
    try {
      const { invoiceId } = req.params;
      const acknowledgement = await LearnerDashboardService.downloadInvoice(req.user.id, invoiceId);
      return success(res, {
        data: acknowledgement,
        message: 'Invoice download prepared'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateBillingPreferences(req, res, next) {
    try {
      const acknowledgement = await LearnerDashboardService.updateBillingPreferences(req.user.id, req.body);
      return success(res, {
        data: acknowledgement,
        message: 'Billing preferences updated'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async joinLiveSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const acknowledgement = await LearnerDashboardService.joinLiveSession(req.user.id, sessionId);
      return success(res, {
        data: acknowledgement,
        message: 'Live session joined'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async checkInToLiveSession(req, res, next) {
    try {
      const { sessionId } = req.params;
      const acknowledgement = await LearnerDashboardService.checkInToLiveSession(req.user.id, sessionId);
      return success(res, {
        data: acknowledgement,
        message: 'Live session check-in recorded'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async triggerCommunityAction(req, res, next) {
    try {
      const { communityId } = req.params;
      const acknowledgement = await LearnerDashboardService.triggerCommunityAction(req.user.id, communityId, req.body);
      return success(res, {
        data: acknowledgement,
        message: 'Community action triggered'
      });
    } catch (error) {
      return next(error);
    }
  }
}
