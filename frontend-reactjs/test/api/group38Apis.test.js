import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { httpClient } from '../../src/api/httpClient.js';
import {
  fetchThreadMessages,
  createThread,
  updateThreadMetadata,
  muteThread,
  fetchThreadParticipants
} from '../../src/api/inboxApi.js';
import {
  cancelInstructorBooking,
  updateInstructorBooking,
  getInstructorBooking,
  bulkCancelInstructorBookings
} from '../../src/api/instructorBookingsApi.js';
import {
  generateCourseOutline,
  simulateCurriculumAudit,
  cancelWorkshopRun
} from '../../src/api/instructorOrchestrationApi.js';
import {
  deleteInstructorRosterEntry,
  fetchInstructorRosterSlot,
  swapInstructorRosterSlots
} from '../../src/api/instructorRosterApi.js';
import {
  triggerIntegrationRun,
  updateIntegrationSettings,
  downloadIntegrationReport
} from '../../src/api/integrationAdminApi.js';
import {
  submitIntegrationInvite,
  previewIntegrationInvite,
  declineIntegrationInvite
} from '../../src/api/integrationInviteApi.js';
import {
  createTutorBookingRequest,
  updateTutorBooking,
  fetchLearnerOverview,
  updateNotificationPreferences,
  exportLearningPath
} from '../../src/api/learnerDashboardApi.js';
import {
  requestMediaUpload,
  pollMediaUploadStatus,
  cancelMediaUpload,
  completeMediaUpload
} from '../../src/api/mediaApi.js';
import {
  listScamReports,
  updateScamReport,
  escalateScamReport,
  listContentAppeals,
  resolveContentAppeal
} from '../../src/api/moderationApi.js';
import {
  createPaymentIntent,
  capturePayPalOrder,
  refundPayment,
  listPaymentIntents
} from '../../src/api/paymentsApi.js';
import { createRiskRegisterEntry } from '../../src/api/securityOperationsApi.js';
import { followUser } from '../../src/api/socialGraphApi.js';
import { updateCurrentUser } from '../../src/api/userApi.js';
import { fetchVerificationSummary } from '../../src/api/verificationApi.js';
import {
  fetchExecutiveOverview,
  fetchOperationsDigest,
  acknowledgeOperationsIncident
} from '../../src/api/operatorDashboardApi.js';

let spies;

const resetHttpClientSpies = () => {
  spies = {
    get: vi.spyOn(httpClient, 'get'),
    post: vi.spyOn(httpClient, 'post'),
    patch: vi.spyOn(httpClient, 'patch'),
    delete: vi.spyOn(httpClient, 'delete'),
    put: vi.spyOn(httpClient, 'put')
  };

  Object.values(spies).forEach((spy) => {
    spy.mockImplementation(() => Promise.resolve(undefined));
  });
};

beforeEach(() => {
  vi.restoreAllMocks();
  resetHttpClientSpies();
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('Group 38 API modules', () => {
  describe('instructorBookingsApi', () => {
    it('throws when cancelling without a booking identifier', async () => {
      await expect(cancelInstructorBooking({ token: 'abc' })).rejects.toThrow('booking identifier');
    });

    it('sends delete request with payload body when cancelling', async () => {
      spies.delete.mockResolvedValue({ data: { id: 'bk-1' }, meta: null });

      const result = await cancelInstructorBooking({
        token: 'admin-token',
        bookingId: 'bk-1',
        payload: { reason: 'schedule_conflict' }
      });

      expect(spies.delete).toHaveBeenCalledWith('/instructor/bookings/bk-1', {
        token: 'admin-token',
        body: { reason: 'schedule_conflict' },
        cache: { invalidateTags: ['instructor:bookings', 'instructor:bookings:bk-1'] }
      });
      expect(result).toEqual({ data: { id: 'bk-1' }, meta: null });
    });

    it('validates booking identifier on update', async () => {
      await expect(updateInstructorBooking({ token: 'abc', payload: {} })).rejects.toThrow(
        'booking identifier'
      );
    });

    it('fetches individual bookings with cache metadata', async () => {
      spies.get.mockResolvedValue({ data: { id: 'bk-2' }, meta: { source: 'cache' } });

      const result = await getInstructorBooking({ token: 'abc', bookingId: 'bk-2' });

      expect(spies.get).toHaveBeenCalledWith('/instructor/bookings/bk-2', {
        token: 'abc',
        signal: undefined,
        cache: {
          ttl: 15_000,
          tags: ['instructor:bookings:bk-2'],
          varyByToken: true
        }
      });
      expect(result).toEqual({ data: { id: 'bk-2' }, meta: { source: 'cache' } });
    });

    it('supports bulk cancellation with tag invalidation for each booking', async () => {
      spies.post.mockResolvedValue({ data: { cancelled: 2 }, meta: null });

      const response = await bulkCancelInstructorBookings({
        token: 'bulk-admin',
        bookingIds: ['bk-1', 'bk-2'],
        reason: 'weather'
      });

      expect(spies.post).toHaveBeenCalledWith(
        '/instructor/bookings/bulk-cancel',
        { bookingIds: ['bk-1', 'bk-2'], reason: 'weather' },
        {
          token: 'bulk-admin',
          signal: undefined,
          invalidateTags: [
            'instructor:bookings',
            'instructor:bookings:bk-1',
            'instructor:bookings:bk-2'
          ]
        }
      );
      expect(response).toEqual({ data: { cancelled: 2 }, meta: null });
    });
  });

  describe('inboxApi', () => {
    it('requests thread messages with correct params', async () => {
      spies.get.mockResolvedValue({ data: [{ id: 'msg-1' }], pagination: { limit: 20, hasMore: true } });

      const result = await fetchThreadMessages('thread-1', {
        token: 'user-token',
        limit: 50,
        before: 'cursor',
        direction: 'backward',
        signal: new AbortController().signal
      });

      expect(spies.get).toHaveBeenCalledWith('/chat/threads/thread-1/messages', {
        token: 'user-token',
        signal: expect.any(AbortSignal),
        params: { limit: 50, before: 'cursor', after: undefined, direction: 'backward' }
      });
      expect(result).toEqual({
        messages: [{ id: 'msg-1' }],
        pagination: expect.objectContaining({ limit: 20, hasMore: true })
      });
    });

    it('creates threads with sanitized participants', async () => {
      spies.post.mockResolvedValue({ data: { id: 'thread-123', participants: [{ email: 'a@example.com' }] } });

      const thread = await createThread({
        token: 'moderator',
        subject: ' Project Kickoff ',
        participants: ['a@example.com', 'a@example.com ']
      });

      expect(spies.post).toHaveBeenCalledWith(
        '/chat/threads',
        {
          subject: 'Project Kickoff',
          participants: [{ email: 'a@example.com' }],
          initialMessage: null
        },
        { token: 'moderator', signal: undefined, invalidateTags: ['chat:threads'] }
      );
      expect(thread).toEqual({
        id: 'thread-123',
        subject: 'Project Kickoff',
        lastMessageAt: null,
        unreadCount: 0,
        participants: [{ email: 'a@example.com' }],
        isArchived: false,
        isMuted: false
      });
    });

    it('supports muting threads with optional durations', async () => {
      spies.post.mockResolvedValue({ data: { id: 'thread-1', isMuted: true } });

      await muteThread('thread-1', { token: 'moderator', durationMinutes: 60 });

      expect(spies.post).toHaveBeenCalledWith(
        '/chat/threads/thread-1/mute',
        { durationMinutes: 60 },
        {
          token: 'moderator',
          signal: undefined,
          invalidateTags: ['chat:thread:thread-1']
        }
      );
    });
  });

  describe('instructorOrchestrationApi', () => {
    it('defaults payload to empty object when generating course outlines', async () => {
      spies.post.mockResolvedValue({ data: { outline: [] } });

      const result = await generateCourseOutline({ token: 'abc' });

      expect(spies.post).toHaveBeenCalledWith(
        '/instructor/orchestration/course-outline',
        {},
        { token: 'abc', signal: undefined, headers: undefined, cache: false }
      );
      expect(result).toEqual({ outline: [] });
    });

    it('sends payloads for curriculum audit simulations', async () => {
      spies.post.mockResolvedValue({ data: { score: 92 } });

      await simulateCurriculumAudit({ token: 'ops', payload: { courseId: 'course-1' } });

      expect(spies.post).toHaveBeenCalledWith(
        '/instructor/orchestration/curriculum-audit',
        { courseId: 'course-1' },
        { token: 'ops', signal: undefined, headers: undefined, cache: false }
      );
    });

    it('encodes identifiers when cancelling workshops', async () => {
      spies.post.mockResolvedValue({ data: { cancelled: true } });

      await cancelWorkshopRun({ token: 'ops', workshopId: 'wr/1' });

      expect(spies.post).toHaveBeenCalledWith(
        '/instructor/orchestration/workshops/wr%2F1/cancel',
        {},
        { token: 'ops', signal: undefined, headers: undefined, cache: false }
      );
    });
  });

  describe('instructorRosterApi', () => {
    it('maps delete responses to include meta information', async () => {
      spies.delete.mockResolvedValue({ data: [{ id: 'slot-1' }], meta: { total: 1 } });

      const result = await deleteInstructorRosterEntry({ token: 'instructor', slotId: 'slot-1' });

      expect(spies.delete).toHaveBeenCalledWith('/instructor/roster/slot-1', {
        token: 'instructor',
        cache: { invalidateTags: ['instructor:roster', 'instructor:roster:slot-1'] }
      });
      expect(result).toEqual({ data: [{ id: 'slot-1' }], meta: { total: 1 } });
    });

    it('fetches individual roster slots with tenant aware caching', async () => {
      spies.get.mockResolvedValue({ data: { id: 'slot-9' } });

      await fetchInstructorRosterSlot({ token: 'instructor', slotId: 'slot-9' });

      expect(spies.get).toHaveBeenCalledWith('/instructor/roster/slot-9', {
        token: 'instructor',
        signal: undefined,
        cache: {
          ttl: 30_000,
          tags: ['instructor:roster:slot-9'],
          varyByToken: true
        }
      });
    });

    it('swaps roster slots while invalidating relevant caches', async () => {
      spies.post.mockResolvedValue({ data: { swapped: true } });

      await swapInstructorRosterSlots({
        token: 'coach',
        sourceSlotId: 'slot-1',
        targetSlotId: 'slot-2'
      });

      expect(spies.post).toHaveBeenCalledWith(
        '/instructor/roster/slot-1/swap',
        { targetSlotId: 'slot-2' },
        {
          token: 'coach',
          signal: undefined,
          invalidateTags: ['instructor:roster', 'instructor:roster:slot-1', 'instructor:roster:slot-2']
        }
      );
    });
  });

  describe('integrationAdminApi', () => {
    it('throws when integration identifier is missing for triggerIntegrationRun', async () => {
      await expect(
        triggerIntegrationRun({ token: 'admin-token', windowStartAt: '2024-01-01T00:00:00Z' })
      ).rejects.toThrow('Integration identifier is required');
    });

    it('includes optional window boundaries when triggering integration run', async () => {
      spies.post.mockResolvedValue({ data: { status: 'queued' } });

      await triggerIntegrationRun({
        token: 'admin-token',
        integration: 'crm-sync',
        windowStartAt: '2024-01-01T00:00:00Z',
        windowEndAt: '2024-01-02T00:00:00Z'
      });

      expect(spies.post).toHaveBeenCalledWith(
        '/admin/integrations/crm-sync/runs',
        {
          windowStartAt: '2024-01-01T00:00:00Z',
          windowEndAt: '2024-01-02T00:00:00Z'
        },
        {
          token: 'admin-token',
          cache: false,
          invalidateTags: ['integration-dashboard-crm-sync']
        }
      );
    });

    it('updates integration settings with encoded identifiers', async () => {
      spies.put.mockResolvedValue({ data: { updated: true } });

      await updateIntegrationSettings({
        token: 'admin-token',
        integration: 'crm sync',
        payload: { mode: 'live' }
      });

      expect(spies.put).toHaveBeenCalledWith(
        '/admin/integrations/crm%20sync/settings',
        { mode: 'live' },
        {
          token: 'admin-token',
          signal: undefined,
          cache: false,
          invalidateTags: ['integration-settings-crm sync']
        }
      );
    });

    it('requests binary reports when csv format is selected', async () => {
      spies.get.mockResolvedValue({ data: {} });

      await downloadIntegrationReport({
        token: 'admin-token',
        integration: 'crm-sync',
        format: 'csv',
        params: { range: '30d' }
      });

      expect(spies.get).toHaveBeenCalledWith(
        '/admin/integrations/crm-sync/report',
        {
          token: 'admin-token',
          signal: undefined,
          params: { range: '30d', format: 'csv' },
          responseType: 'blob',
          cache: { enabled: false }
        }
      );
    });
  });

  describe('integrationInviteApi', () => {
    it('encodes invite token and forwards payload', async () => {
      spies.post.mockResolvedValue({ data: { accepted: true } });

      const result = await submitIntegrationInvite({
        token: ' invite token ',
        key: 'secret-key',
        rotationIntervalDays: 30,
        signal: new AbortController().signal
      });

      expect(spies.post).toHaveBeenCalledWith(
        '/integration-invites/invite%20token',
        expect.objectContaining({ key: 'secret-key', rotationIntervalDays: 30 }),
        {
          signal: expect.any(AbortSignal),
          cache: false
        }
      );
      expect(result).toEqual({ accepted: true });
    });

    it('previews invitations without authentication tokens', async () => {
      spies.get.mockResolvedValue({ data: { status: 'pending' } });

      const result = await previewIntegrationInvite({ token: 'abc123' });

      expect(spies.get).toHaveBeenCalledWith('/integration-invites/abc123/preview', {
        signal: undefined,
        cache: { enabled: false }
      });
      expect(result).toEqual({ status: 'pending' });
    });

    it('declines invites with optional reasons', async () => {
      spies.post.mockResolvedValue({ data: { declined: true } });

      await declineIntegrationInvite({ token: 'abc123', reason: 'no longer needed' });

      expect(spies.post).toHaveBeenCalledWith(
        '/integration-invites/abc123/decline',
        { reason: 'no longer needed' },
        {
          signal: undefined,
          cache: false
        }
      );
    });
  });

  describe('learnerDashboardApi', () => {
    it('requires authentication tokens for tutor booking requests', async () => {
      await expect(createTutorBookingRequest({ payload: {} })).rejects.toThrow('token');
    });

    it('invalidates learner cache when creating tutor booking requests', async () => {
      spies.post.mockResolvedValue({ data: { id: 'booking-1' } });

      await createTutorBookingRequest({
        token: 'learner-token',
        payload: { topic: 'Calculus' },
        signal: new AbortController().signal
      });

      expect(spies.post).toHaveBeenCalledWith(
        '/dashboard/learner/tutor-bookings',
        { topic: 'Calculus' },
        {
          token: 'learner-token',
          signal: expect.any(AbortSignal),
          invalidateTags: ['dashboard:me:learner-token']
        }
      );
    });

    it('throws when updating tutor bookings without an identifier', async () => {
      await expect(updateTutorBooking({ token: 'learner-token', payload: {} })).rejects.toThrow(
        'booking identifier'
      );
    });

    it('returns normalized overview payloads with caching metadata', async () => {
      spies.get.mockResolvedValue({
        data: {
          stats: { completed: 3 },
          recommendations: ['Try a cohort'],
          upcoming: [],
          alerts: []
        }
      });

      const overview = await fetchLearnerOverview({ token: 'learner-token' });

      expect(spies.get).toHaveBeenCalledWith('/dashboard/learner/overview', {
        token: 'learner-token',
        signal: undefined,
        cache: {
          ttl: 30_000,
          tags: ['dashboard:me:learner-token:overview'],
          varyByToken: true
        }
      });
      expect(overview).toEqual({
        stats: { completed: 3 },
        recommendations: ['Try a cohort'],
        upcoming: [],
        alerts: []
      });
    });

    it('updates notification preferences and invalidates learner cache', async () => {
      spies.put.mockResolvedValue({});

      await updateNotificationPreferences({ token: 'learner-token', payload: { email: true } });

      expect(spies.put).toHaveBeenCalledWith(
        '/dashboard/learner/settings/notifications',
        { email: true },
        {
          token: 'learner-token',
          signal: undefined,
          invalidateTags: ['dashboard:me:learner-token']
        }
      );
    });

    it('exports learning paths as binary payloads when requested', async () => {
      spies.get.mockResolvedValue({ data: {} });

      await exportLearningPath({ token: 'learner-token', format: 'pdf' });

      expect(spies.get).toHaveBeenCalledWith(
        '/dashboard/learner/learning-path/export',
        {
          token: 'learner-token',
          signal: undefined,
          params: { format: 'pdf' },
          responseType: 'blob',
          cache: false
        }
      );
    });
  });

  describe('mediaApi', () => {
    it('validates required upload metadata', () => {
      expect(() => requestMediaUpload({ payload: {} })).toThrow('filename');
    });

    it('polls upload statuses with cache configuration', async () => {
      spies.get.mockResolvedValue({ data: { status: 'processing' } });

      await pollMediaUploadStatus({ token: 'media', uploadId: 'up-1' });

      expect(spies.get).toHaveBeenCalledWith('/media/uploads/up-1/status', {
        token: 'media',
        signal: undefined,
        cache: {
          ttl: 5_000,
          tags: ['media:upload:up-1:status'],
          varyByToken: true
        }
      });
    });

    it('cancels uploads and invalidates cached status', async () => {
      spies.post.mockResolvedValue({ data: { cancelled: true } });

      await cancelMediaUpload({ token: 'media', uploadId: 'up-2', reason: 'user cancelled' });

      expect(spies.post).toHaveBeenCalledWith(
        '/media/uploads/up-2/cancel',
        { reason: 'user cancelled' },
        {
          token: 'media',
          signal: undefined,
          invalidateTags: ['media:upload:up-2']
        }
      );
    });

    it('completes uploads with optional payloads', async () => {
      spies.post.mockResolvedValue({ data: { status: 'complete' } });

      await completeMediaUpload({ token: 'media', uploadId: 'up-3', payload: { checksum: 'abc' } });

      expect(spies.post).toHaveBeenCalledWith(
        '/media/uploads/up-3/complete',
        { checksum: 'abc' },
        {
          token: 'media',
          signal: undefined,
          invalidateTags: ['media:upload:up-3']
        }
      );
    });
  });

  describe('moderationApi', () => {
    it('requires authentication token to fetch scam reports', async () => {
      await expect(listScamReports()).rejects.toThrow('Authentication token');
    });

    it('encodes identifiers when updating scam reports', async () => {
      spies.patch.mockResolvedValue({ data: { id: 'sr-1', status: 'resolved' } });

      await updateScamReport({ token: 'moderator', reportId: 'sr/1', payload: { status: 'resolved' } });

      expect(spies.patch).toHaveBeenCalledWith(
        '/community-moderation/scam-reports/sr%2F1',
        { status: 'resolved' },
        {
          token: 'moderator',
          signal: undefined
        }
      );
    });

    it('escalates scam reports with optional reason', async () => {
      spies.post.mockResolvedValue({ data: { escalated: true } });

      await escalateScamReport({ token: 'moderator', reportId: 'sr-5', reason: 'fraudulent' });

      expect(spies.post).toHaveBeenCalledWith(
        '/community-moderation/scam-reports/sr-5/escalate',
        { reason: 'fraudulent' },
        { token: 'moderator', signal: undefined }
      );
    });

    it('lists content appeals with caching hints', async () => {
      spies.get.mockResolvedValue({ data: [] });

      await listContentAppeals({ token: 'moderator', params: { status: 'open' } });

      expect(spies.get).toHaveBeenCalledWith('/community-moderation/content-appeals', {
        token: 'moderator',
        params: { status: 'open' },
        signal: undefined,
        cache: {
          ttl: 15_000,
          tags: ['moderation:appeals'],
          varyByToken: true
        }
      });
    });

    it('resolves content appeals and invalidates caches', async () => {
      spies.post.mockResolvedValue({ data: { resolved: true } });

      await resolveContentAppeal({ token: 'moderator', appealId: 'ap-3', payload: { outcome: 'approved' } });

      expect(spies.post).toHaveBeenCalledWith(
        '/community-moderation/content-appeals/ap-3/resolve',
        { outcome: 'approved' },
        {
          token: 'moderator',
          signal: undefined,
          invalidateTags: ['moderation:appeals']
        }
      );
    });
  });

  describe('paymentsApi', () => {
    it('rejects unauthenticated payment intent requests', () => {
      expect(() => createPaymentIntent({ payload: {} })).toThrow('Authentication token');
    });

    it('validates payment payload before creating intents', () => {
      expect(() =>
        createPaymentIntent({
          token: 'payer',
          payload: { provider: 'stripe', currency: 'USD' }
        })
      ).toThrow('either a non-negative amount or at least one line item');
    });

    it('encodes payment identifiers when capturing PayPal orders', async () => {
      spies.post.mockResolvedValue({ data: { id: 'pay-1' } });

      await capturePayPalOrder({ token: 'payer', paymentId: 'order/1' });

      expect(spies.post).toHaveBeenCalledWith(
        '/payments/paypal/order%2F1/capture',
        {},
        { token: 'payer', signal: undefined }
      );
    });

    it('supports refunding processed payments', async () => {
      spies.post.mockResolvedValue({ data: { id: 'refund-1' } });

      await refundPayment({ token: 'payer', paymentId: 'pay-1', payload: { amount: 500 } });

      expect(spies.post).toHaveBeenCalledWith(
        '/payments/pay-1/refunds',
        { amount: 500 },
        {
          token: 'payer',
          signal: undefined,
          invalidateTags: ['payments:pay-1']
        }
      );
    });

    it('lists payment intents with caching metadata', async () => {
      spies.get.mockResolvedValue({ data: [] });

      await listPaymentIntents({ token: 'payer', params: { status: 'requires_payment_method' } });

      expect(spies.get).toHaveBeenCalledWith('/payments', {
        token: 'payer',
        params: { status: 'requires_payment_method' },
        signal: undefined,
        cache: {
          ttl: 30_000,
          tags: ['payments:intents'],
          varyByToken: true
        }
      });
    });
  });

  describe('securityOperationsApi', () => {
    it('requires token and mandatory fields when creating risk entries', async () => {
      await expect(createRiskRegisterEntry({})).rejects.toThrow('Authentication token');
      await expect(
        createRiskRegisterEntry({ token: 'sec-ops', payload: { title: 'Risk' } })
      ).rejects.toThrow('description');
    });
  });

  describe('socialGraphApi', () => {
    it('rejects follow requests without a target user', async () => {
      await expect(followUser({ token: 'user' })).rejects.toThrow('target user');
    });

    it('sends default metadata and invalidates caches when following users', async () => {
      spies.post.mockResolvedValue({ data: { status: 'pending' } });

      await followUser({ token: 'user', userId: 'target-1', payload: {} });

      expect(spies.post).toHaveBeenCalledWith(
        '/social/follows/target-1',
        {
          source: 'profile.follow',
          reason: null,
          metadata: {}
        },
        {
          token: 'user',
          signal: undefined,
          cache: { enabled: false },
          invalidateTags: [
            'social:followers:target-1:accepted',
            'social:followers:target-1:pending',
            'social:following:me:accepted',
            'social:recommendations:me'
          ]
        }
      );
    });
  });

  describe('userApi', () => {
    it('requires authentication token to update the current user profile', async () => {
      await expect(updateCurrentUser({ payload: { name: 'Alex' } })).rejects.toThrow(
        'Authentication token'
      );
    });
  });

  describe('verificationApi', () => {
    it('requires authentication to fetch verification summary', async () => {
      await expect(fetchVerificationSummary()).rejects.toThrow('Authentication token');
    });
  });

  describe('operatorDashboardApi', () => {
    it('normalises executive overview responses', async () => {
      spies.get.mockResolvedValue({
        data: {
          kpis: [{ id: 'revenue', label: 'Revenue', value: 100000, change: 5 }],
          incidents: {
            active: [{ id: 'inc-1', summary: 'Outage', severity: 'high' }]
          },
          releases: {
            upcoming: [{ id: 'rel-1', name: 'Release', version: '1.0.0' }]
          }
        }
      });

      const overview = await fetchExecutiveOverview({ token: 'ops-token' });

      expect(spies.get).toHaveBeenCalledWith('/operator/executive/overview', {
        token: 'ops-token',
        signal: undefined,
        params: undefined,
        cache: {
          ttl: 60_000,
          tags: ['operator:executive:default'],
          varyByToken: true,
          varyByHeaders: ['Accept-Language']
        }
      });
      expect(overview.kpis[0]).toMatchObject({ id: 'revenue', value: 100000 });
      expect(overview.incidents.active[0].summary).toBe('Outage');
    });

    it('fetches operations digests with tenant awareness', async () => {
      spies.get.mockResolvedValue({ data: { incidents: [] } });

      await fetchOperationsDigest({ token: 'ops-token', tenantId: 'eu-west' });

      expect(spies.get).toHaveBeenCalledWith('/operator/operations/digest', {
        token: 'ops-token',
        signal: undefined,
        params: { tenantId: 'eu-west' },
        cache: {
          ttl: 60_000,
          tags: ['operator:operations:eu-west'],
          varyByToken: true,
          varyByHeaders: ['Accept-Language']
        }
      });
    });

    it('acknowledges incidents and invalidates cache entries', async () => {
      spies.post.mockResolvedValue({ data: { acknowledged: true } });

      await acknowledgeOperationsIncident({ token: 'ops-token', incidentId: 'inc-1', tenantId: 'us' });

      expect(spies.post).toHaveBeenCalledWith(
        '/operator/operations/incidents/inc-1/acknowledge',
        {},
        {
          token: 'ops-token',
          params: { tenantId: 'us' },
          cache: { enabled: false },
          invalidateTags: ['operator:operations:us']
        }
      );
    });
  });
});
