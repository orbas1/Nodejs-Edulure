import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { httpClient } from '../../src/api/httpClient.js';
import { fetchThreadMessages } from '../../src/api/inboxApi.js';
import {
  cancelInstructorBooking,
  updateInstructorBooking
} from '../../src/api/instructorBookingsApi.js';
import { generateCourseOutline } from '../../src/api/instructorOrchestrationApi.js';
import { deleteInstructorRosterEntry } from '../../src/api/instructorRosterApi.js';
import { triggerIntegrationRun } from '../../src/api/integrationAdminApi.js';
import { submitIntegrationInvite } from '../../src/api/integrationInviteApi.js';
import {
  createTutorBookingRequest,
  updateTutorBooking
} from '../../src/api/learnerDashboardApi.js';
import { requestMediaUpload } from '../../src/api/mediaApi.js';
import { listScamReports, updateScamReport } from '../../src/api/moderationApi.js';
import { createPaymentIntent, capturePayPalOrder } from '../../src/api/paymentsApi.js';
import { createRiskRegisterEntry } from '../../src/api/securityOperationsApi.js';
import { followUser } from '../../src/api/socialGraphApi.js';
import { updateCurrentUser } from '../../src/api/userApi.js';
import { fetchVerificationSummary } from '../../src/api/verificationApi.js';
import { fetchExecutiveOverview } from '../../src/api/operatorDashboardApi.js';

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
        cache: { invalidateTags: ['instructor:bookings'] }
      });
      expect(result).toEqual({ data: { id: 'bk-1' }, meta: null });
    });

    it('validates booking identifier on update', async () => {
      await expect(updateInstructorBooking({ token: 'abc', payload: {} })).rejects.toThrow(
        'booking identifier'
      );
    });
  });

  describe('inboxApi', () => {
    it('requests thread messages with correct params', async () => {
      spies.get.mockResolvedValue({ data: [] });

      await fetchThreadMessages('thread-1', {
        token: 'user-token',
        limit: 50,
        before: 'cursor',
        signal: new AbortController().signal
      });

      expect(spies.get).toHaveBeenCalledWith('/chat/threads/thread-1/messages', {
        token: 'user-token',
        signal: expect.any(AbortSignal),
        params: { limit: 50, before: 'cursor', after: undefined }
      });
    });
  });

  describe('instructorOrchestrationApi', () => {
    it('defaults payload to empty object when generating course outlines', async () => {
      spies.post.mockResolvedValue({ data: { outline: [] } });

      const result = await generateCourseOutline({ token: 'abc' });

      expect(spies.post).toHaveBeenCalledWith(
        '/instructor/orchestration/course-outline',
        {},
        { token: 'abc' }
      );
      expect(result).toEqual({ outline: [] });
    });
  });

  describe('instructorRosterApi', () => {
    it('maps delete responses to include meta information', async () => {
      spies.delete.mockResolvedValue({ data: [{ id: 'slot-1' }], meta: { total: 1 } });

      const result = await deleteInstructorRosterEntry({ token: 'instructor', slotId: 'slot-1' });

      expect(spies.delete).toHaveBeenCalledWith('/instructor/roster/slot-1', {
        token: 'instructor',
        cache: { invalidateTags: ['instructor:roster'] }
      });
      expect(result).toEqual({ data: [{ id: 'slot-1' }], meta: { total: 1 } });
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
  });

  describe('mediaApi', () => {
    it('validates required upload metadata', () => {
      expect(() => requestMediaUpload({ payload: {} })).toThrow('filename');
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
  });
});
