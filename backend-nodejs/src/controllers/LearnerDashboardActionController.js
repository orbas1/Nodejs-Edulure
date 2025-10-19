import LearnerDashboardActionService from '../services/LearnerDashboardActionService.js';
import { success } from '../utils/httpResponse.js';

const learnerDashboardActionService = new LearnerDashboardActionService();

export default class LearnerDashboardActionController {
  static async createBooking(req, res, next) {
    try {
      const result = await learnerDashboardActionService.createBooking({
        userId: req.user.id,
        payload: req.body ?? {}
      });
      return success(res, {
        data: result,
        message: result.message ?? 'Tutor booking created.'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async exportBookings(req, res, next) {
    try {
      const result = await learnerDashboardActionService.exportBookings({ userId: req.user.id });
      return success(res, {
        data: result,
        message: result.message ?? 'Tutor bookings export prepared.'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async syncCourseGoal(req, res, next) {
    try {
      const result = await learnerDashboardActionService.syncCourseGoal({
        userId: req.user.id,
        payload: req.body ?? {}
      });
      return success(res, {
        data: result,
        message: result.message ?? 'Course goal synced.'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async syncCourseCalendar(req, res, next) {
    try {
      const result = await learnerDashboardActionService.syncCourseCalendar({
        userId: req.user.id,
        payload: req.body ?? {}
      });
      return success(res, {
        data: result,
        message: result.message ?? 'Course calendar sync complete.'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async resumeEbook(req, res, next) {
    try {
      const result = await learnerDashboardActionService.resumeEbook({
        userId: req.user.id,
        ebookId: req.params.ebookId,
        payload: req.body ?? {}
      });
      return success(res, {
        data: result,
        message: result.message ?? 'E-book resumed.'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async shareEbook(req, res, next) {
    try {
      const result = await learnerDashboardActionService.shareEbook({
        userId: req.user.id,
        ebookId: req.params.ebookId,
        payload: req.body ?? {}
      });
      return success(res, {
        data: result,
        message: result.message ?? 'E-book shared.'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async downloadStatement(req, res, next) {
    try {
      const result = await learnerDashboardActionService.downloadBillingStatement({
        userId: req.user.id,
        invoiceId: req.params.invoiceId
      });
      return success(res, {
        data: result,
        message: result.message ?? 'Billing statement ready.'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async joinLiveSession(req, res, next) {
    try {
      const result = await learnerDashboardActionService.joinLiveSession({
        userId: req.user.id,
        sessionId: req.params.sessionId,
        payload: req.body ?? {}
      });
      return success(res, {
        data: result,
        message: result.message ?? 'Join link issued.'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async checkInLiveSession(req, res, next) {
    try {
      const result = await learnerDashboardActionService.checkInLiveSession({
        userId: req.user.id,
        sessionId: req.params.sessionId,
        payload: req.body ?? {}
      });
      return success(res, {
        data: result,
        message: result.message ?? 'Live session check-in complete.'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async createCommunityInitiative(req, res, next) {
    try {
      const result = await learnerDashboardActionService.createCommunityInitiative({
        userId: req.user.id,
        communityId: req.params.communityId,
        payload: req.body ?? {}
      });
      return success(res, {
        data: result,
        message: result.message ?? 'Community initiative created.'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async exportCommunityHealth(req, res, next) {
    try {
      const result = await learnerDashboardActionService.exportCommunityHealth({
        userId: req.user.id,
        communityId: req.params.communityId
      });
      return success(res, {
        data: result,
        message: result.message ?? 'Community health report generated.'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async createCommunityPipelineStage(req, res, next) {
    try {
      const result = await learnerDashboardActionService.createCommunityPipelineStage({
        userId: req.user.id,
        payload: req.body ?? {}
      });
      return success(res, {
        data: result,
        message: result.message ?? 'Pipeline stage created.'
      });
    } catch (error) {
      return next(error);
    }
  }
}
