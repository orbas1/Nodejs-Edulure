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
import LearnerLibraryEntryModel from '../models/LearnerLibraryEntryModel.js';
import FieldServiceOrderModel from '../models/FieldServiceOrderModel.js';
import FieldServiceEventModel from '../models/FieldServiceEventModel.js';
import FieldServiceProviderModel from '../models/FieldServiceProviderModel.js';
import buildFieldServiceWorkspace from './FieldServiceWorkspace.js';

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

function formatLastOpenedLabel(value) {
  if (!value) {
    return 'Not opened yet';
  }
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'Not opened yet';
    }
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  } catch (_error) {
    return 'Not opened yet';
  }
}

function formatLibraryEntry(entry) {
  if (!entry) return null;
  return {
    id: entry.id,
    title: entry.title,
    format: entry.format,
    progress: Number(entry.progress ?? 0),
    lastOpened: entry.lastOpened ?? null,
    lastOpenedLabel: formatLastOpenedLabel(entry.lastOpened),
    url: entry.url ?? null,
    summary: entry.summary ?? null,
    author: entry.author ?? null,
    coverUrl: entry.coverUrl ?? null,
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    highlights: Array.isArray(entry.highlights) ? entry.highlights : [],
    audioUrl: entry.audioUrl ?? null,
    previewUrl: entry.previewUrl ?? null,
    metadata: entry.metadata ?? {}
  };
}

async function buildFieldServiceAssignment({ userId, order, connection = db }) {
  if (!order) return null;
  const [events, providers] = await Promise.all([
    FieldServiceEventModel.listByOrderIds([order.id], connection),
    order.providerId ? FieldServiceProviderModel.listByIds([order.providerId], connection) : []
  ]);

  const workspace = buildFieldServiceWorkspace({
    now: new Date(),
    user: { id: userId },
    orders: [order],
    events,
    providers
  });

  return workspace.customer?.assignments?.find((assignment) => assignment.id === order.id) ?? null;
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

  static async updateTutorBookingRequest(userId, bookingId, payload = {}) {
    if (!bookingId) {
      const error = new Error('Tutor booking identifier is required');
      error.status = 400;
      throw error;
    }

    log.info({ userId, bookingId, payload }, 'Learner updated tutor booking');
    return buildAcknowledgement({
      reference: bookingId,
      message: 'Tutor booking updated',
      meta: {
        status: payload.status ?? 'updated',
        topic: payload.topic ?? null,
        preferredDate: payload.preferredDate ?? null
      }
    });
  }

  static async cancelTutorBookingRequest(userId, bookingId, payload = {}) {
    if (!bookingId) {
      const error = new Error('Tutor booking identifier is required');
      error.status = 400;
      throw error;
    }
    log.info({ userId, bookingId, payload }, 'Learner cancelled tutor booking');
    return buildAcknowledgement({
      reference: bookingId,
      message: 'Tutor booking cancelled',
      meta: {
        reason: payload.reason ?? null
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

  static async createLearnerLibraryEntry(userId, payload = {}) {
    if (!payload.title) {
      throw new Error('A title is required to add a library entry');
    }

    const entry = await LearnerLibraryEntryModel.create({
      userId,
      title: payload.title.trim(),
      format: payload.format?.trim() || 'E-book',
      progress: Math.max(0, Math.min(100, Number(payload.progress ?? 0))),
      lastOpened: payload.lastOpened ?? null,
      url: payload.url ?? null,
      summary: payload.summary ?? null,
      author: payload.author ?? null,
      coverUrl: payload.coverUrl ?? null,
      tags: Array.isArray(payload.tags) ? payload.tags : payload.tags ? [payload.tags].flat() : [],
      metadata: { source: 'learner-dashboard' }
    });

    return formatLibraryEntry(entry);
  }

  static async updateLearnerLibraryEntry(userId, entryId, payload = {}) {
    const entry = await LearnerLibraryEntryModel.findByIdForUser(userId, entryId);
    if (!entry) {
      const error = new Error('Library entry not found');
      error.status = 404;
      throw error;
    }

    const updated = await LearnerLibraryEntryModel.updateByIdForUser(userId, entryId, {
      title: payload.title !== undefined ? payload.title.trim() : undefined,
      format: payload.format !== undefined ? payload.format.trim() : undefined,
      progress:
        payload.progress !== undefined
          ? Math.max(0, Math.min(100, Number(payload.progress)))
          : undefined,
      lastOpened: payload.lastOpened !== undefined ? payload.lastOpened : undefined,
      url: payload.url !== undefined ? payload.url : undefined,
      summary: payload.summary !== undefined ? payload.summary : undefined,
      author: payload.author !== undefined ? payload.author : undefined,
      coverUrl: payload.coverUrl !== undefined ? payload.coverUrl : undefined,
      tags:
        payload.tags !== undefined
          ? Array.isArray(payload.tags)
            ? payload.tags
            : [payload.tags].flat().filter(Boolean)
          : undefined
    });

    return formatLibraryEntry(updated);
  }

  static async deleteLearnerLibraryEntry(userId, entryId) {
    const deleted = await LearnerLibraryEntryModel.deleteByIdForUser(userId, entryId);
    if (!deleted) {
      const error = new Error('Library entry not found');
      error.status = 404;
      throw error;
    }

    return buildAcknowledgement({
      reference: entryId,
      message: 'Library entry removed',
      meta: { entryId }
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

  static async createFieldServiceAssignment(userId, payload = {}) {
    if (!payload.serviceType) {
      throw new Error('Service type is required to dispatch a field service assignment');
    }

    const owner = payload.owner?.trim();
    if (!owner) {
      throw new Error('An assignment owner is required');
    }

    return db.transaction(async (trx) => {
      const reference = generateReference('fs');
      const metadata = {
        owner,
        supportChannel: payload.supportChannel ?? null,
        briefUrl: payload.briefUrl ?? null,
        fieldNotes: payload.fieldNotes ?? null,
        equipment: payload.equipment ?? null,
        attachments: Array.isArray(payload.attachments)
          ? payload.attachments.map((item) => String(item).trim()).filter(Boolean)
          : [],
        debriefHost: payload.debriefHost ?? null,
        debriefAt: payload.debriefAt ?? null
      };

      const order = await FieldServiceOrderModel.createAssignment(
        {
          reference,
          customerUserId: userId,
          status: payload.status ? String(payload.status).toLowerCase() : 'dispatched',
          priority: payload.priority ? String(payload.priority).toLowerCase() : 'standard',
          serviceType: payload.serviceType.trim(),
          summary: payload.fieldNotes ?? null,
          requestedAt: new Date().toISOString(),
          scheduledFor: payload.scheduledFor ?? null,
          locationLabel: payload.location ?? null,
          metadata
        },
        trx
      );

      await FieldServiceEventModel.create(
        {
          orderId: order.id,
          eventType: 'dispatch_created',
          status: order.status,
          notes: payload.fieldNotes ?? null,
          author: owner,
          metadata: {
            supportChannel: payload.supportChannel ?? null
          }
        },
        trx
      );

      const assignment = await buildFieldServiceAssignment({ userId, order, connection: trx });
      return assignment ?? {
        id: order.id,
        reference: order.reference,
        status: order.status,
        serviceType: order.serviceType,
        priority: order.priority
      };
    });
  }

  static async updateFieldServiceAssignment(userId, assignmentId, payload = {}) {
    const order = await FieldServiceOrderModel.findByIdForCustomer(userId, assignmentId);
    if (!order) {
      const error = new Error('Field service assignment not found');
      error.status = 404;
      throw error;
    }

    const metadata = { ...order.metadata };
    if (payload.owner !== undefined) {
      metadata.owner = payload.owner?.trim() || null;
    }
    if (payload.supportChannel !== undefined) {
      metadata.supportChannel = payload.supportChannel || null;
    }
    if (payload.briefUrl !== undefined) {
      metadata.briefUrl = payload.briefUrl || null;
    }
    if (payload.fieldNotes !== undefined) {
      metadata.fieldNotes = payload.fieldNotes || null;
    }
    if (payload.equipment !== undefined) {
      metadata.equipment = payload.equipment || null;
    }
    if (payload.attachments !== undefined) {
      metadata.attachments = Array.isArray(payload.attachments)
        ? payload.attachments.map((item) => String(item).trim()).filter(Boolean)
        : [];
    }
    if (payload.debriefHost !== undefined) {
      metadata.debriefHost = payload.debriefHost || null;
    }
    if (payload.debriefAt !== undefined) {
      metadata.debriefAt = payload.debriefAt || null;
    }
    if (payload.escalation) {
      metadata.escalatedAt = new Date().toISOString();
    }

    return db.transaction(async (trx) => {
      const updated = await FieldServiceOrderModel.updateById(
        order.id,
        {
          status: payload.status ? String(payload.status).toLowerCase() : undefined,
          priority: payload.priority ? String(payload.priority).toLowerCase() : undefined,
          serviceType: payload.serviceType ? payload.serviceType.trim() : undefined,
          summary: payload.fieldNotes !== undefined ? payload.fieldNotes : undefined,
          scheduledFor: payload.scheduledFor !== undefined ? payload.scheduledFor : undefined,
          locationLabel: payload.location !== undefined ? payload.location : undefined,
          metadata
        },
        trx
      );

      const eventType = payload.status
        ? `status_${String(payload.status).toLowerCase()}`
        : 'details_updated';

      await FieldServiceEventModel.create(
        {
          orderId: order.id,
          eventType,
          status: payload.status ? String(payload.status).toLowerCase() : updated.status,
          notes: payload.fieldNotes ?? payload.notes ?? null,
          author: metadata.owner ?? 'Learner operations',
          metadata: {
            supportChannel: metadata.supportChannel ?? null,
            escalation: Boolean(payload.escalation ?? false)
          }
        },
        trx
      );

      const assignment = await buildFieldServiceAssignment({ userId, order: updated, connection: trx });
      return assignment ?? {
        id: updated.id,
        status: updated.status,
        serviceType: updated.serviceType,
        priority: updated.priority
      };
    });
  }

  static async closeFieldServiceAssignment(userId, assignmentId, payload = {}) {
    const order = await FieldServiceOrderModel.findByIdForCustomer(userId, assignmentId);
    if (!order) {
      const error = new Error('Field service assignment not found');
      error.status = 404;
      throw error;
    }

    return db.transaction(async (trx) => {
      const metadata = {
        ...order.metadata,
        resolution: payload.resolution ?? null,
        closedAt: new Date().toISOString(),
        closedBy: userId
      };

      const updated = await FieldServiceOrderModel.updateById(
        order.id,
        {
          status: 'closed',
          metadata
        },
        trx
      );

      await FieldServiceEventModel.create(
        {
          orderId: order.id,
          eventType: 'job_completed',
          status: 'closed',
          notes: payload.resolution ?? null,
          author: metadata.owner ?? 'Learner operations',
          metadata: {
            resolution: payload.resolution ?? null
          }
        },
        trx
      );

      return buildAcknowledgement({
        reference: updated.reference ?? `fs-${updated.id}`,
        message: 'Field service assignment closed',
        meta: {
          assignmentId: updated.id
        }
      });
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
