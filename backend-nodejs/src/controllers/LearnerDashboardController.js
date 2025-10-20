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

  static async listTutorBookings(req, res, next) {
    try {
      const bookings = await LearnerDashboardService.listTutorBookings(req.user.id);
      return success(res, {
        data: { bookings },
        message: 'Tutor bookings loaded'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateTutorBooking(req, res, next) {
    try {
      const acknowledgement = await LearnerDashboardService.updateTutorBooking(
        req.user.id,
        req.params.bookingId,
        req.body
      );
      return success(res, {
        data: acknowledgement,
        message: 'Tutor booking updated'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async cancelTutorBooking(req, res, next) {
    try {
      const acknowledgement = await LearnerDashboardService.cancelTutorBooking(
        req.user.id,
        req.params.bookingId,
        req.body
      );
      return success(res, {
        data: acknowledgement,
        message: 'Tutor booking cancelled'
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

  static async listSupportTickets(req, res, next) {
    try {
      const tickets = await LearnerDashboardService.listSupportTickets(req.user.id);
      return success(res, {
        data: { tickets },
        message: 'Support tickets loaded'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async createSupportTicket(req, res, next) {
    try {
      const ticket = await LearnerDashboardService.createSupportTicket(req.user.id, req.body);
      return success(res, {
        data: { ticket },
        message: 'Support request submitted'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateSupportTicket(req, res, next) {
    try {
      const { ticketId } = req.params;
      const ticket = await LearnerDashboardService.updateSupportTicket(req.user.id, ticketId, req.body);
      return success(res, {
        data: { ticket },
        message: 'Support request updated'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async replyToSupportTicket(req, res, next) {
    try {
      const { ticketId } = req.params;
      const message = await LearnerDashboardService.addSupportTicketMessage(req.user.id, ticketId, req.body);
      return success(res, {
        data: { message },
        message: 'Reply posted to support case'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async closeSupportTicket(req, res, next) {
    try {
      const { ticketId } = req.params;
      const ticket = await LearnerDashboardService.closeSupportTicket(req.user.id, ticketId, req.body);
      return success(res, {
        data: { ticket },
        message: 'Support request closed'
      });
    } catch (error) {
      return next(error);
    }
  }
}
