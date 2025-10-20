import crypto from 'crypto';

import logger from '../config/logger.js';
import db from '../config/database.js';
import LearnerSupportRepository from '../repositories/LearnerSupportRepository.js';
import LearnerPaymentMethodModel from '../models/LearnerPaymentMethodModel.js';
import LearnerBillingContactModel from '../models/LearnerBillingContactModel.js';
import LearnerFinancialProfileModel from '../models/LearnerFinancialProfileModel.js';
import LearnerGrowthInitiativeModel from '../models/LearnerGrowthInitiativeModel.js';
import LearnerGrowthExperimentModel from '../models/LearnerGrowthExperimentModel.js';
import LearnerAffiliateChannelModel from '../models/LearnerAffiliateChannelModel.js';
import LearnerAffiliatePayoutModel from '../models/LearnerAffiliatePayoutModel.js';
import LearnerAdCampaignModel from '../models/LearnerAdCampaignModel.js';
import InstructorApplicationModel from '../models/InstructorApplicationModel.js';

const log = logger.child({ service: 'LearnerDashboardService' });

function generateReference(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

function buildAcknowledgement({
  reference,
  message,
  meta = {}
}) {
  return {
    reference,
    message,
    meta
  };
}

export default class LearnerDashboardService {
  static async listPaymentMethods(userId) {
    return LearnerPaymentMethodModel.listByUserId(userId);
  }

  static async createPaymentMethod(userId, payload = {}) {
    if (!payload.label || !payload.brand || !payload.last4 || !payload.expiry) {
      throw new Error('Label, brand, last four digits, and expiry are required for a payment method');
    }

    return db.transaction(async (trx) => {
      if (payload.primary) {
        await LearnerPaymentMethodModel.clearPrimaryForUser(userId, trx);
      }
      const method = await LearnerPaymentMethodModel.create(
        {
          userId,
          label: payload.label,
          brand: payload.brand,
          last4: payload.last4.slice(-4),
          expiry: payload.expiry,
          primary: Boolean(payload.primary),
          metadata: payload.metadata ?? {}
        },
        trx
      );
      return method;
    });
  }

  static async updatePaymentMethod(userId, methodId, payload = {}) {
    const method = await LearnerPaymentMethodModel.findByIdForUser(userId, methodId);
    if (!method) {
      const error = new Error('Payment method not found');
      error.status = 404;
      throw error;
    }

    return db.transaction(async (trx) => {
      if (payload.primary === true) {
        await LearnerPaymentMethodModel.clearPrimaryForUser(userId, trx);
      }
      const updated = await LearnerPaymentMethodModel.updateById(
        methodId,
        {
          userId,
          label: payload.label ?? method.label,
          brand: payload.brand ?? method.brand,
          last4: payload.last4 ? payload.last4.slice(-4) : method.last4,
          expiry: payload.expiry ?? method.expiry,
          primary: payload.primary === undefined ? method.primary : Boolean(payload.primary),
          metadata: payload.metadata ?? method.metadata
        },
        trx
      );
      return updated;
    });
  }

  static async removePaymentMethod(userId, methodId) {
    const deleted = await LearnerPaymentMethodModel.deleteByIdForUser(userId, methodId);
    if (!deleted) {
      const error = new Error('Payment method not found');
      error.status = 404;
      throw error;
    }
    return buildAcknowledgement({
      reference: methodId,
      message: 'Payment method removed',
      meta: { methodId }
    });
  }

  static async listBillingContacts(userId) {
    return LearnerBillingContactModel.listByUserId(userId);
  }

  static async upsertBillingContact(userId, payload = {}) {
    if (!payload.name || !payload.email) {
      throw new Error('Name and email are required for a billing contact');
    }
    const existing = await LearnerBillingContactModel.findByEmail(userId, payload.email);
    if (existing) {
      return LearnerBillingContactModel.updateById(existing.id, {
        userId,
        name: payload.name,
        email: payload.email,
        phone: payload.phone ?? null,
        company: payload.company ?? null,
        metadata: payload.metadata ?? existing.metadata ?? {}
      });
    }
    return LearnerBillingContactModel.create({
      userId,
      name: payload.name,
      email: payload.email,
      phone: payload.phone ?? null,
      company: payload.company ?? null,
      metadata: payload.metadata ?? {}
    });
  }

  static async deleteBillingContact(userId, contactId) {
    const deleted = await LearnerBillingContactModel.deleteByIdForUser(userId, contactId);
    if (!deleted) {
      const error = new Error('Billing contact not found');
      error.status = 404;
      throw error;
    }
    return buildAcknowledgement({
      reference: contactId,
      message: 'Billing contact removed',
      meta: { contactId }
    });
  }

  static async updateFinancialPreferences(userId, payload = {}) {
    const profile = await LearnerFinancialProfileModel.upsertForUser(userId, {
      autoPayEnabled: Boolean(payload.autoPay?.enabled ?? payload.autoPayEnabled ?? false),
      reserveTargetCents: Math.max(0, Number(payload.reserveTargetCents ?? payload.reserveTarget ?? 0)),
      preferences: payload.preferences ?? payload.metadata ?? {}
    });
    return buildAcknowledgement({
      reference: profile.id,
      message: 'Financial preferences updated',
      meta: {
        autoPayEnabled: profile.autoPayEnabled,
        reserveTargetCents: profile.reserveTargetCents
      }
    });
  }

  static async listGrowthInitiatives(userId) {
    return LearnerGrowthInitiativeModel.listByUserId(userId);
  }

  static async createGrowthInitiative(userId, payload = {}) {
    if (!payload.slug || !payload.title) {
      throw new Error('A slug and title are required for a growth initiative');
    }
    const existing = await LearnerGrowthInitiativeModel.findBySlug(userId, payload.slug);
    if (existing) {
      const error = new Error('A growth initiative with this slug already exists');
      error.status = 409;
      throw error;
    }
    return LearnerGrowthInitiativeModel.create({
      userId,
      slug: payload.slug,
      title: payload.title,
      status: payload.status ?? 'planning',
      objective: payload.objective ?? null,
      primaryMetric: payload.primaryMetric ?? null,
      baselineValue: payload.baselineValue ?? null,
      targetValue: payload.targetValue ?? null,
      currentValue: payload.currentValue ?? null,
      startAt: payload.startAt ?? null,
      endAt: payload.endAt ?? null,
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      metadata: payload.metadata ?? {}
    });
  }

  static async updateGrowthInitiative(userId, initiativeId, payload = {}) {
    const initiative = await LearnerGrowthInitiativeModel.findByIdForUser(userId, initiativeId);
    if (!initiative) {
      const error = new Error('Growth initiative not found');
      error.status = 404;
      throw error;
    }
    return LearnerGrowthInitiativeModel.updateById(initiativeId, { ...payload, userId });
  }

  static async deleteGrowthInitiative(userId, initiativeId) {
    const deleted = await LearnerGrowthInitiativeModel.deleteByIdForUser(userId, initiativeId);
    if (!deleted) {
      const error = new Error('Growth initiative not found');
      error.status = 404;
      throw error;
    }
    return buildAcknowledgement({
      reference: initiativeId,
      message: 'Growth initiative removed',
      meta: { initiativeId }
    });
  }

  static async listGrowthExperiments(userId, initiativeId) {
    const initiative = await LearnerGrowthInitiativeModel.findByIdForUser(userId, initiativeId);
    if (!initiative) {
      const error = new Error('Growth initiative not found');
      error.status = 404;
      throw error;
    }
    return LearnerGrowthExperimentModel.listByInitiativeId(initiativeId);
  }

  static async createGrowthExperiment(userId, initiativeId, payload = {}) {
    const initiative = await LearnerGrowthInitiativeModel.findByIdForUser(userId, initiativeId);
    if (!initiative) {
      const error = new Error('Growth initiative not found');
      error.status = 404;
      throw error;
    }
    if (!payload.name) {
      throw new Error('A name is required for a growth experiment');
    }
    return LearnerGrowthExperimentModel.create({
      initiativeId,
      name: payload.name,
      status: payload.status ?? 'draft',
      hypothesis: payload.hypothesis ?? null,
      metric: payload.metric ?? null,
      baselineValue: payload.baselineValue ?? null,
      targetValue: payload.targetValue ?? null,
      resultValue: payload.resultValue ?? null,
      startAt: payload.startAt ?? null,
      endAt: payload.endAt ?? null,
      segments: Array.isArray(payload.segments) ? payload.segments : [],
      metadata: payload.metadata ?? {}
    });
  }

  static async updateGrowthExperiment(userId, initiativeId, experimentId, payload = {}) {
    const initiative = await LearnerGrowthInitiativeModel.findByIdForUser(userId, initiativeId);
    if (!initiative) {
      const error = new Error('Growth initiative not found');
      error.status = 404;
      throw error;
    }
    const experiment = await LearnerGrowthExperimentModel.findById(experimentId);
    if (!experiment || experiment.initiativeId !== initiativeId) {
      const error = new Error('Growth experiment not found');
      error.status = 404;
      throw error;
    }
    return LearnerGrowthExperimentModel.updateById(experimentId, payload);
  }

  static async deleteGrowthExperiment(userId, initiativeId, experimentId) {
    const initiative = await LearnerGrowthInitiativeModel.findByIdForUser(userId, initiativeId);
    if (!initiative) {
      const error = new Error('Growth initiative not found');
      error.status = 404;
      throw error;
    }
    const experiment = await LearnerGrowthExperimentModel.findById(experimentId);
    if (!experiment || experiment.initiativeId !== initiativeId) {
      const error = new Error('Growth experiment not found');
      error.status = 404;
      throw error;
    }
    await LearnerGrowthExperimentModel.deleteById(experimentId);
    return buildAcknowledgement({
      reference: experimentId,
      message: 'Growth experiment removed',
      meta: { experimentId }
    });
  }

  static async listAffiliateChannels(userId) {
    return LearnerAffiliateChannelModel.listByUserId(userId);
  }

  static async createAffiliateChannel(userId, payload = {}) {
    if (!payload.platform || !payload.referralCode) {
      throw new Error('Platform and referral code are required to create an affiliate channel');
    }
    return LearnerAffiliateChannelModel.create({
      userId,
      platform: payload.platform,
      handle: payload.handle ?? null,
      referralCode: payload.referralCode,
      trackingUrl: payload.trackingUrl ?? null,
      status: payload.status ?? 'draft',
      commissionRateBps: payload.commissionRateBps ?? 250,
      totalEarningsCents: payload.totalEarningsCents ?? 0,
      totalPaidCents: payload.totalPaidCents ?? 0,
      notes: Array.isArray(payload.notes) ? payload.notes : [],
      performance: payload.performance ?? {},
      metadata: payload.metadata ?? {}
    });
  }

  static async updateAffiliateChannel(userId, channelId, payload = {}) {
    const channel = await LearnerAffiliateChannelModel.findByIdForUser(userId, channelId);
    if (!channel) {
      const error = new Error('Affiliate channel not found');
      error.status = 404;
      throw error;
    }
    return LearnerAffiliateChannelModel.updateById(channelId, { ...payload, userId });
  }

  static async deleteAffiliateChannel(userId, channelId) {
    const deleted = await LearnerAffiliateChannelModel.deleteByIdForUser(userId, channelId);
    if (!deleted) {
      const error = new Error('Affiliate channel not found');
      error.status = 404;
      throw error;
    }
    return buildAcknowledgement({
      reference: channelId,
      message: 'Affiliate channel archived',
      meta: { channelId }
    });
  }

  static async recordAffiliatePayout(userId, channelId, payload = {}) {
    const channel = await LearnerAffiliateChannelModel.findByIdForUser(userId, channelId);
    if (!channel) {
      const error = new Error('Affiliate channel not found');
      error.status = 404;
      throw error;
    }
    if (!payload.amountCents) {
      throw new Error('An amount is required to record a payout');
    }
    const payout = await LearnerAffiliatePayoutModel.create({
      channelId,
      amountCents: payload.amountCents,
      currency: payload.currency ?? 'USD',
      status: payload.status ?? 'scheduled',
      scheduledAt: payload.scheduledAt ?? new Date().toISOString(),
      processedAt: payload.processedAt ?? null,
      reference: payload.reference ?? null,
      note: payload.note ?? null,
      metadata: payload.metadata ?? {}
    });

    await LearnerAffiliateChannelModel.updateById(channelId, {
      totalEarningsCents: channel.totalEarningsCents,
      totalPaidCents: channel.totalPaidCents + (payout.status === 'paid' ? payout.amountCents : 0)
    });

    return payout;
  }

  static async listAdCampaigns(userId) {
    return LearnerAdCampaignModel.listByUserId(userId);
  }

  static async createAdCampaign(userId, payload = {}) {
    if (!payload.name) {
      throw new Error('Campaign name is required');
    }
    return LearnerAdCampaignModel.create({
      userId,
      name: payload.name,
      status: payload.status ?? 'draft',
      objective: payload.objective ?? null,
      dailyBudgetCents: payload.dailyBudgetCents ?? 0,
      totalSpendCents: payload.totalSpendCents ?? 0,
      startAt: payload.startAt ?? null,
      endAt: payload.endAt ?? null,
      lastSyncedAt: payload.lastSyncedAt ?? null,
      metrics: payload.metrics ?? {},
      targeting: payload.targeting ?? {},
      creative: payload.creative ?? {},
      placements: Array.isArray(payload.placements) ? payload.placements : [],
      metadata: payload.metadata ?? {}
    });
  }

  static async updateAdCampaign(userId, campaignId, payload = {}) {
    const campaign = await LearnerAdCampaignModel.findByIdForUser(userId, campaignId);
    if (!campaign) {
      const error = new Error('Ad campaign not found');
      error.status = 404;
      throw error;
    }
    return LearnerAdCampaignModel.updateById(campaignId, { ...payload, userId });
  }

  static async deleteAdCampaign(userId, campaignId) {
    const deleted = await LearnerAdCampaignModel.deleteByIdForUser(userId, campaignId);
    if (!deleted) {
      const error = new Error('Ad campaign not found');
      error.status = 404;
      throw error;
    }
    return buildAcknowledgement({
      reference: campaignId,
      message: 'Ad campaign removed',
      meta: { campaignId }
    });
  }

  static async getInstructorApplication(userId) {
    return InstructorApplicationModel.findByUserId(userId);
  }

  static async upsertInstructorApplication(userId, payload = {}) {
    return InstructorApplicationModel.upsertForUser(userId, {
      status: payload.status ?? 'draft',
      stage: payload.stage ?? 'intake',
      motivation: payload.motivation ?? null,
      portfolioUrl: payload.portfolioUrl ?? null,
      experienceYears: payload.experienceYears ?? 0,
      teachingFocus: Array.isArray(payload.teachingFocus) ? payload.teachingFocus : [],
      availability: payload.availability ?? {},
      marketingAssets: Array.isArray(payload.marketingAssets) ? payload.marketingAssets : [],
      submittedAt: payload.submittedAt ?? null,
      reviewedAt: payload.reviewedAt ?? null,
      decisionNote: payload.decisionNote ?? null,
      metadata: payload.metadata ?? {}
    });
  }

  static async submitInstructorApplication(userId, payload = {}) {
    const application = await this.upsertInstructorApplication(userId, {
      ...payload,
      status: 'submitted',
      stage: 'portfolio',
      submittedAt: new Date().toISOString()
    });
    return buildAcknowledgement({
      reference: application.id,
      message: 'Instructor application submitted',
      meta: { status: application.status, stage: application.stage }
    });
  }

  static async createTutorBookingRequest(userId, payload = {}) {
    const bookingId = generateReference('booking');
    log.info({ userId, bookingId, payload }, 'Learner requested new tutor booking');
    return buildAcknowledgement({
      reference: bookingId,
      message: 'Tutor booking request submitted',
      meta: {
        status: 'requested',
        topic: payload.topic ?? 'Mentorship session',
        preferredDate: payload.preferredDate ?? null
      }
    });
  }

  static async exportTutorSchedule(userId) {
    const exportId = generateReference('schedule');
    log.info({ userId, exportId }, 'Learner requested tutor schedule export');
    return buildAcknowledgement({
      reference: exportId,
      message: 'Tutor agenda export ready',
      meta: {
        downloadUrl: `/exports/${exportId}.ics`
      }
    });
  }

  static async createCourseGoal(userId, courseId, payload = {}) {
    const goalId = generateReference('goal');
    log.info({ userId, courseId, goalId, payload }, 'Learner created a new course goal');
    return buildAcknowledgement({
      reference: goalId,
      message: 'Learning goal created',
      meta: {
        courseId,
        target: payload.target ?? null,
        dueDate: payload.dueDate ?? null
      }
    });
  }

  static async resumeEbook(userId, ebookId) {
    log.info({ userId, ebookId }, 'Learner resumed ebook');
    return buildAcknowledgement({
      reference: ebookId,
      message: 'E-book resumed'
    });
  }

  static async shareEbook(userId, ebookId, payload = {}) {
    const shareId = generateReference('share');
    log.info({ userId, ebookId, shareId, payload }, 'Learner shared ebook highlight');
    return buildAcknowledgement({
      reference: shareId,
      message: 'E-book highlight shared',
      meta: {
        recipients: Array.isArray(payload.recipients) ? payload.recipients : payload.recipient ? [payload.recipient] : []
      }
    });
  }

  static async downloadInvoice(userId, invoiceId) {
    log.info({ userId, invoiceId }, 'Learner requested invoice download');
    return buildAcknowledgement({
      reference: invoiceId,
      message: 'Invoice download ready',
      meta: {
        downloadUrl: `/billing/invoices/${invoiceId}.pdf`
      }
    });
  }

  static async updateBillingPreferences(userId, payload = {}) {
    const meta = {};

    if (payload.billingContact) {
      const contact = await this.upsertBillingContact(userId, payload.billingContact);
      meta.contact = contact;
    }

    if (
      payload.autoPay !== undefined ||
      payload.autoPayEnabled !== undefined ||
      payload.reserveTarget !== undefined ||
      payload.reserveTargetCents !== undefined ||
      payload.preferences !== undefined
    ) {
      const acknowledgement = await this.updateFinancialPreferences(userId, payload);
      meta.preferences = acknowledgement.meta;
    }

    if (payload.paymentMethod || payload.autoRenew !== undefined) {
      meta.legacy = {
        autoRenew: payload.autoRenew ?? null,
        paymentMethod: payload.paymentMethod ?? null
      };
    }

    const preferenceId = generateReference('billing');
    log.info({ userId, preferenceId, payload, meta }, 'Learner updated billing preferences');
    return buildAcknowledgement({
      reference: preferenceId,
      message: 'Billing preferences updated',
      meta
    });
  }

  static async joinLiveSession(userId, sessionId) {
    log.info({ userId, sessionId }, 'Learner joined live session');
    return buildAcknowledgement({
      reference: sessionId,
      message: 'Live session joined'
    });
  }

  static async checkInToLiveSession(userId, sessionId) {
    const checkInId = generateReference('checkin');
    log.info({ userId, sessionId, checkInId }, 'Learner checked in to live session');
    return buildAcknowledgement({
      reference: checkInId,
      message: 'Live session check-in recorded',
      meta: {
        sessionId
      }
    });
  }

  static async triggerCommunityAction(userId, communityId, payload = {}) {
    const actionId = generateReference('community');
    log.info({ userId, communityId, payload, actionId }, 'Learner launched community action');
    return buildAcknowledgement({
      reference: actionId,
      message: 'Community action triggered',
      meta: {
        communityId,
        action: payload.action ?? 'general'
      }
    });
  }

  static async listSupportTickets(userId) {
    const cases = await LearnerSupportRepository.listCases(userId);
    return cases;
  }

  static async createSupportTicket(userId, payload = {}) {
    if (!payload.subject) {
      throw new Error('Subject is required to create a support ticket');
    }
    const initialMessages = [];
    if (payload.description) {
      initialMessages.push({
        author: 'learner',
        body: payload.description,
        attachments: payload.attachments ?? [],
        createdAt: new Date().toISOString()
      });
    }
    const ticket = await LearnerSupportRepository.createCase(userId, {
      subject: payload.subject,
      category: payload.category ?? 'General',
      priority: payload.priority ?? 'normal',
      status: 'open',
      channel: 'Portal',
      initialMessages,
      metadata: payload.metadata ?? {}
    });
    log.info({ userId, ticketId: ticket?.id }, 'Learner created support ticket');
    return ticket;
  }

  static async updateSupportTicket(userId, ticketId, payload = {}) {
    const ticket = await LearnerSupportRepository.updateCase(userId, ticketId, payload);
    if (!ticket) {
      throw new Error('Support ticket not found');
    }
    log.info({ userId, ticketId }, 'Learner updated support ticket');
    return ticket;
  }

  static async addSupportTicketMessage(userId, ticketId, payload = {}) {
    if (!payload.body && !Array.isArray(payload.attachments)) {
      throw new Error('Message content is required');
    }
    const message = await LearnerSupportRepository.addMessage(userId, ticketId, {
      author: payload.author ?? 'learner',
      body: payload.body ?? '',
      attachments: payload.attachments ?? [],
      createdAt: payload.createdAt ?? new Date().toISOString()
    });
    if (!message) {
      throw new Error('Support ticket not found');
    }
    log.info({ userId, ticketId }, 'Learner added support ticket message');
    return message;
  }

  static async closeSupportTicket(userId, ticketId, payload = {}) {
    const ticket = await LearnerSupportRepository.closeCase(userId, ticketId, {
      resolutionNote: payload.resolutionNote ?? payload.note ?? null,
      satisfaction: payload.satisfaction ?? null
    });
    if (!ticket) {
      throw new Error('Support ticket not found');
    }
    log.info({ userId, ticketId }, 'Learner closed support ticket');
    return ticket;
  }
}
