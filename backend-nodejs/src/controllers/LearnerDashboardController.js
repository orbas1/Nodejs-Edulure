import LearnerDashboardService from '../services/LearnerDashboardService.js';
import { success } from '../utils/httpResponse.js';

export default class LearnerDashboardController {
  static async createPaymentMethod(req, res, next) {
    try {
      const method = await LearnerDashboardService.createPaymentMethod(req.user.id, req.body);
      return success(res, {
        data: method,
        message: 'Payment method added to wallet',
        status: 201
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updatePaymentMethod(req, res, next) {
    try {
      const { methodId } = req.params;
      const method = await LearnerDashboardService.updatePaymentMethod(req.user.id, methodId, req.body);
      return success(res, {
        data: method,
        message: 'Payment method updated'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async removePaymentMethod(req, res, next) {
    try {
      const { methodId } = req.params;
      const acknowledgement = await LearnerDashboardService.removePaymentMethod(req.user.id, methodId);
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Payment method removed'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async deleteBillingContact(req, res, next) {
    try {
      const { contactId } = req.params;
      const acknowledgement = await LearnerDashboardService.deleteBillingContact(req.user.id, contactId);
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Billing contact removed'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async createGrowthInitiative(req, res, next) {
    try {
      const initiative = await LearnerDashboardService.createGrowthInitiative(req.user.id, req.body);
      return success(res, {
        data: initiative,
        message: 'Growth initiative created',
        status: 201
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateGrowthInitiative(req, res, next) {
    try {
      const { initiativeId } = req.params;
      const initiative = await LearnerDashboardService.updateGrowthInitiative(req.user.id, initiativeId, req.body);
      return success(res, {
        data: initiative,
        message: 'Growth initiative updated'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async deleteGrowthInitiative(req, res, next) {
    try {
      const { initiativeId } = req.params;
      const acknowledgement = await LearnerDashboardService.deleteGrowthInitiative(req.user.id, initiativeId);
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Growth initiative removed'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async createGrowthExperiment(req, res, next) {
    try {
      const { initiativeId } = req.params;
      const experiment = await LearnerDashboardService.createGrowthExperiment(req.user.id, initiativeId, req.body);
      return success(res, {
        data: experiment,
        message: 'Growth experiment created',
        status: 201
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateGrowthExperiment(req, res, next) {
    try {
      const { initiativeId, experimentId } = req.params;
      const experiment = await LearnerDashboardService.updateGrowthExperiment(
        req.user.id,
        initiativeId,
        experimentId,
        req.body
      );
      return success(res, {
        data: experiment,
        message: 'Growth experiment updated'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async deleteGrowthExperiment(req, res, next) {
    try {
      const { initiativeId, experimentId } = req.params;
      const acknowledgement = await LearnerDashboardService.deleteGrowthExperiment(
        req.user.id,
        initiativeId,
        experimentId
      );
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Growth experiment removed'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async createAffiliateChannel(req, res, next) {
    try {
      const channel = await LearnerDashboardService.createAffiliateChannel(req.user.id, req.body);
      return success(res, {
        data: channel,
        message: 'Affiliate channel created',
        status: 201
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateAffiliateChannel(req, res, next) {
    try {
      const { channelId } = req.params;
      const channel = await LearnerDashboardService.updateAffiliateChannel(req.user.id, channelId, req.body);
      return success(res, {
        data: channel,
        message: 'Affiliate channel updated'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async deleteAffiliateChannel(req, res, next) {
    try {
      const { channelId } = req.params;
      const acknowledgement = await LearnerDashboardService.deleteAffiliateChannel(req.user.id, channelId);
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Affiliate channel removed'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async recordAffiliatePayout(req, res, next) {
    try {
      const { channelId } = req.params;
      const payout = await LearnerDashboardService.recordAffiliatePayout(req.user.id, channelId, req.body);
      return success(res, {
        data: payout,
        message: 'Affiliate payout recorded',
        status: 201
      });
    } catch (error) {
      return next(error);
    }
  }

  static async createAdCampaign(req, res, next) {
    try {
      const campaign = await LearnerDashboardService.createAdCampaign(req.user.id, req.body);
      return success(res, {
        data: campaign,
        message: 'Ad campaign created',
        status: 201
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateAdCampaign(req, res, next) {
    try {
      const { campaignId } = req.params;
      const campaign = await LearnerDashboardService.updateAdCampaign(req.user.id, campaignId, req.body);
      return success(res, {
        data: campaign,
        message: 'Ad campaign updated'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async deleteAdCampaign(req, res, next) {
    try {
      const { campaignId } = req.params;
      const acknowledgement = await LearnerDashboardService.deleteAdCampaign(req.user.id, campaignId);
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Ad campaign removed'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getInstructorApplication(req, res, next) {
    try {
      const application = await LearnerDashboardService.getInstructorApplication(req.user.id);
      return success(res, {
        data: { application },
        message: 'Instructor application resolved'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async saveInstructorApplication(req, res, next) {
    try {
      const application = await LearnerDashboardService.upsertInstructorApplication(req.user.id, req.body);
      return success(res, {
        data: { application },
        message: 'Instructor application updated'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async submitInstructorApplication(req, res, next) {
    try {
      const acknowledgement = await LearnerDashboardService.submitInstructorApplication(req.user.id, req.body);
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Instructor application submitted'
      });
    } catch (error) {
      return next(error);
    }
  }

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

  static async updateTutorBooking(req, res, next) {
    try {
      const { bookingId } = req.params;
      const acknowledgement = await LearnerDashboardService.updateTutorBookingRequest(
        req.user.id,
        bookingId,
        req.body
      );
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Tutor booking updated'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async cancelTutorBooking(req, res, next) {
    try {
      const { bookingId } = req.params;
      const acknowledgement = await LearnerDashboardService.cancelTutorBookingRequest(
        req.user.id,
        bookingId,
        req.body
      );
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Tutor booking cancelled'
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

  static async createLibraryEntry(req, res, next) {
    try {
      const entry = await LearnerDashboardService.createLearnerLibraryEntry(req.user.id, req.body);
      return success(res, {
        data: entry,
        message: 'Library entry created',
        status: 201
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateLibraryEntry(req, res, next) {
    try {
      const { ebookId } = req.params;
      const entry = await LearnerDashboardService.updateLearnerLibraryEntry(req.user.id, ebookId, req.body);
      return success(res, {
        data: entry,
        message: 'Library entry updated'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async deleteLibraryEntry(req, res, next) {
    try {
      const { ebookId } = req.params;
      const acknowledgement = await LearnerDashboardService.deleteLearnerLibraryEntry(req.user.id, ebookId);
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Library entry removed'
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

  static async createFieldServiceAssignment(req, res, next) {
    try {
      const assignment = await LearnerDashboardService.createFieldServiceAssignment(req.user.id, req.body);
      return success(res, {
        data: assignment,
        message: 'Field service assignment dispatched',
        status: 201
      });
    } catch (error) {
      return next(error);
    }
  }

  static async updateFieldServiceAssignment(req, res, next) {
    try {
      const { assignmentId } = req.params;
      const assignment = await LearnerDashboardService.updateFieldServiceAssignment(
        req.user.id,
        assignmentId,
        req.body
      );
      return success(res, {
        data: assignment,
        message: 'Field service assignment updated'
      });
    } catch (error) {
      return next(error);
    }
  }

  static async closeFieldServiceAssignment(req, res, next) {
    try {
      const { assignmentId } = req.params;
      const acknowledgement = await LearnerDashboardService.closeFieldServiceAssignment(
        req.user.id,
        assignmentId,
        req.body
      );
      return success(res, {
        data: acknowledgement,
        message: acknowledgement.message ?? 'Field service assignment closed'
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
