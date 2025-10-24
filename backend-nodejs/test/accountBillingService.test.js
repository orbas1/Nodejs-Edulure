import { describe, expect, it, beforeEach, vi } from 'vitest';

const billingPortalSessionModelMock = {
  expireStaleSessions: vi.fn(),
  expireActiveSessionsForUser: vi.fn(),
  create: vi.fn()
};

const paywallTierModelMock = {
  findById: vi.fn()
};

const subscriptionModelMock = {
  listByUser: vi.fn()
};

const paymentIntentModelMock = {
  listByUser: vi.fn()
};

const purchaseModelMock = {
  listByUserId: vi.fn()
};

const financialProfileModelMock = {
  findByUserId: vi.fn()
};

const paymentMethodModelMock = {
  listByUserId: vi.fn()
};

vi.mock('node:crypto', () => ({
  randomUUID: vi.fn(() => 'session-token-1234')
}));

const envMock = {
  app: { baseUrl: 'https://app.edulure.test' },
  payments: {
    billingPortal: {
      enabled: true,
      baseUrl: 'https://billing.edulure.test/portal',
      allowedReturnOrigins: ['https://app.edulure.test'],
      sessionTtlSeconds: 900
    }
  }
};

vi.mock('../src/config/env.js', () => ({
  env: envMock
}));

vi.mock('../src/models/BillingPortalSessionModel.js', () => ({
  __esModule: true,
  default: billingPortalSessionModelMock
}));

vi.mock('../src/models/CommunityPaywallTierModel.js', () => ({
  __esModule: true,
  default: paywallTierModelMock
}));

vi.mock('../src/models/CommunitySubscriptionModel.js', () => ({
  __esModule: true,
  default: subscriptionModelMock
}));

vi.mock('../src/models/PaymentIntentModel.js', () => ({
  __esModule: true,
  default: paymentIntentModelMock
}));

vi.mock('../src/models/LearnerFinancePurchaseModel.js', () => ({
  __esModule: true,
  default: purchaseModelMock
}));

vi.mock('../src/models/LearnerFinancialProfileModel.js', () => ({
  __esModule: true,
  default: financialProfileModelMock
}));

vi.mock('../src/models/LearnerPaymentMethodModel.js', () => ({
  __esModule: true,
  default: paymentMethodModelMock
}));

let AccountBillingService;

describe('AccountBillingService', () => {
  beforeEach(async () => {
    vi.resetModules();
    billingPortalSessionModelMock.expireStaleSessions.mockResolvedValue(0);
    billingPortalSessionModelMock.expireActiveSessionsForUser.mockResolvedValue(0);
    billingPortalSessionModelMock.create.mockResolvedValue({ id: 'session-1' });
    paywallTierModelMock.findById.mockResolvedValue(null);
    subscriptionModelMock.listByUser.mockResolvedValue([]);
    paymentIntentModelMock.listByUser.mockResolvedValue([]);
    purchaseModelMock.listByUserId.mockResolvedValue([]);
    financialProfileModelMock.findByUserId.mockResolvedValue(null);
    paymentMethodModelMock.listByUserId.mockResolvedValue([]);

    ({ default: AccountBillingService } = await import('../src/services/AccountBillingService.js'));
  });

  describe('getBillingOverview', () => {
    it('aggregates subscription, invoice, and profile data into a single snapshot', async () => {
      const now = new Date('2025-03-26T10:00:00.000Z');
      billingPortalSessionModelMock.expireStaleSessions.mockResolvedValue(1);
      financialProfileModelMock.findByUserId.mockResolvedValue({
        autoPayEnabled: true,
        preferences: {
          currency: 'USD',
          collectionMethod: 'Automatic card collection',
          supportTier: 'Priority success desk',
          supportNotes: 'Slack channel support',
          renewalTerm: 'Annual',
          renewalNotes: 'Renews each January',
          seatUsage: { used: 18, total: 25 }
        },
        updatedAt: now
      });

      subscriptionModelMock.listByUser.mockResolvedValue([
        {
          id: 'sub_1',
          tierId: 'tier_1',
          status: 'active',
          metadata: {
            planName: 'Growth',
            billingInterval: 'monthly',
            seatUsage: { used: 18, total: 25 }
          },
          currentPeriodEnd: new Date('2025-04-01T00:00:00.000Z'),
          updatedAt: new Date('2025-03-25T10:00:00.000Z')
        }
      ]);

      paywallTierModelMock.findById.mockResolvedValue({
        id: 'tier_1',
        name: 'Growth Plan',
        priceCents: 25000,
        billingInterval: 'monthly',
        currency: 'USD'
      });

      paymentIntentModelMock.listByUser.mockResolvedValue([
        {
          id: 77,
          publicId: 'pi_77',
          status: 'open',
          amountTotal: 25000,
          amountRefunded: 0,
          currency: 'USD',
          createdAt: new Date('2025-03-10T00:00:00.000Z'),
          metadata: { invoiceNumber: 'INV-204', dueAt: '2025-04-05T00:00:00.000Z' }
        }
      ]);

      purchaseModelMock.listByUserId.mockResolvedValue([
        {
          id: 12,
          reference: 'PUR-12',
          amountCents: 25000,
          currency: 'USD',
          status: 'paid',
          purchasedAt: new Date('2025-02-10T00:00:00.000Z'),
          metadata: { receiptUrl: 'https://cdn.test/pur-12.pdf' }
        }
      ]);

      const overview = await AccountBillingService.getBillingOverview(55);

      expect(billingPortalSessionModelMock.expireStaleSessions).toHaveBeenCalled();
      expect(paywallTierModelMock.findById).toHaveBeenCalledWith('tier_1');
      expect(overview).toEqual(
        expect.objectContaining({
          planName: 'Growth Plan',
          planAmount: 25000,
          amountDueCents: 25000,
          currency: 'USD',
          statusLabel: 'Active',
          billingIntervalLabel: 'Monthly billing',
          seatUsage: { used: 18, total: 25 }
        })
      );
      expect(overview.lastSyncedAt).toBeTruthy();
    });

    it('throws when user identifier is missing', async () => {
      await expect(AccountBillingService.getBillingOverview()).rejects.toThrow(
        'A user identifier is required to load billing overview'
      );
    });
  });

  describe('listPaymentMethods', () => {
    it('normalises stored payment method records', async () => {
      paymentMethodModelMock.listByUserId.mockResolvedValue([
        {
          id: 1,
          brand: 'visa',
          last4: '4242',
          expiry: '11/28',
          primary: true,
          metadata: { statusLabel: 'Default' }
        },
        {
          id: 2,
          metadata: { type: 'ach', last4: '6789', expiry: '05/30', label: 'Corporate ACH' }
        }
      ]);

      const methods = await AccountBillingService.listPaymentMethods(55);
      expect(methods).toHaveLength(2);
      expect(methods[0]).toEqual(
        expect.objectContaining({
          id: '1',
          brand: 'visa',
          expMonth: 11,
          expYear: 2028,
          default: true,
          statusLabel: 'Default'
        })
      );
      expect(methods[1]).toEqual(
        expect.objectContaining({
          id: '2',
          type: 'ach',
          expYear: 2030,
          displayLabel: 'Corporate ACH'
        })
      );
    });

    it('throws when user identifier is missing', async () => {
      await expect(AccountBillingService.listPaymentMethods()).rejects.toThrow(
        'A user identifier is required to list payment methods'
      );
    });
  });

  describe('listInvoices', () => {
    it('merges payment intents and purchases ordered by issued date', async () => {
      paymentIntentModelMock.listByUser.mockResolvedValue([
        {
          id: 10,
          publicId: 'pi_10',
          status: 'succeeded',
          amountTotal: 1999,
          amountRefunded: 0,
          currency: 'usd',
          createdAt: new Date('2025-03-20T00:00:00.000Z'),
          metadata: { invoiceNumber: 'INV-10' }
        }
      ]);

      purchaseModelMock.listByUserId.mockResolvedValue([
        {
          id: 5,
          amountCents: 999,
          currency: 'USD',
          status: 'paid',
          purchasedAt: new Date('2025-02-01T00:00:00.000Z')
        }
      ]);

      const invoices = await AccountBillingService.listInvoices(55);
      expect(invoices).toHaveLength(2);
      expect(invoices[0].number).toBe('INV-10');
      expect(invoices[0].statusLabel).toBe('Paid');
      expect(invoices[1].id).toBe('purchase-5');
    });
  });

  describe('createPortalSession', () => {
    it('persists hashed session tokens and returns resolved portal URL', async () => {
      const result = await AccountBillingService.createPortalSession(
        { id: 55, email: 'learner@example.com', roles: ['user'], userAgent: 'Vitest' },
        { returnUrl: 'https://app.edulure.test/profile/billing' }
      );

      expect(billingPortalSessionModelMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 55,
          token: 'session-token-1234',
          portalUrl: expect.stringContaining('https://billing.edulure.test/portal'),
          returnUrl: 'https://app.edulure.test/profile/billing',
          metadata: expect.objectContaining({
            requestedBy: 'learner@example.com',
            actorRoles: ['user'],
            userAgent: 'Vitest'
          })
        })
      );

      expect(result.url).toContain('https://billing.edulure.test/portal');
      expect(result.url).toContain('session=session-token-1234');
      expect(result.expiresAt).toBeDefined();
    });

    it('rejects when billing portal is disabled', async () => {
      envMock.payments.billingPortal.enabled = false;

      await expect(
        AccountBillingService.createPortalSession({ id: 55 }, { returnUrl: null })
      ).rejects.toMatchObject({ message: 'Billing portal is disabled', status: 503 });

      envMock.payments.billingPortal.enabled = true;
    });

    it('rejects when user identifier missing', async () => {
      await expect(AccountBillingService.createPortalSession(null)).rejects.toThrow(
        'Authentication required to create a billing portal session'
      );
    });
  });
});
