import { describe, expect, it } from 'vitest';

import { normaliseMonetization, resolveDefaultMonetization } from '../src/services/PlatformSettingsService.js';

describe('PlatformSettingsService affiliate normalisation', () => {
  it('clamps finite recurrence and preserves ordered tiers', () => {
    const defaults = resolveDefaultMonetization();

    const payload = {
      affiliate: {
        defaultCommission: {
          recurrence: 'finite',
          maxOccurrences: 999,
          tiers: [
            { thresholdCents: 50_000, rateBps: 1500 },
            { thresholdCents: '250000', rateBps: '2200' }
          ]
        },
        security: {
          enforceTwoFactorForPayouts: false
        }
      }
    };

    const normalised = normaliseMonetization(payload);

    expect(normalised.affiliate.defaultCommission.recurrence).toBe('finite');
    expect(normalised.affiliate.defaultCommission.maxOccurrences).toBe(120);
    expect(normalised.affiliate.defaultCommission.tiers.map((tier) => tier.thresholdCents)).toEqual([
      0,
      50_000,
      250_000
    ]);
    expect(normalised.affiliate.defaultCommission.tiers[0].rateBps).toBe(
      defaults.affiliate.defaultCommission.tiers[0].rateBps
    );
    expect(normalised.affiliate.security.enforceTwoFactorForPayouts).toBe(false);
  });

  it('falls back to defaults when tiers are missing or recurrence invalid', () => {
    const defaults = resolveDefaultMonetization();

    const normalised = normaliseMonetization({
      affiliate: {
        defaultCommission: {
          recurrence: 'weekly',
          maxOccurrences: 0,
          tiers: null
        },
        security: {
          blockSelfReferral: undefined
        }
      },
      workforce: {
        providerControlsCompensation: 'invalid',
        minimumServicemanShareBps: -200,
        recommendedServicemanShareBps: 'invalid',
        nonCustodialWallets: 'no',
        complianceNarrative: ''.padEnd(2501, 'x')
      }
    });

    expect(normalised.affiliate.defaultCommission.recurrence).toBe(
      defaults.affiliate.defaultCommission.recurrence
    );
    expect(normalised.affiliate.defaultCommission.maxOccurrences).toBe(
      defaults.affiliate.defaultCommission.maxOccurrences
    );
    expect(normalised.affiliate.defaultCommission.tiers).toEqual(
      defaults.affiliate.defaultCommission.tiers
    );
    expect(normalised.affiliate.security.blockSelfReferral).toBe(
      defaults.affiliate.security.blockSelfReferral
    );
    expect(normalised.workforce.providerControlsCompensation).toBe(
      defaults.workforce.providerControlsCompensation
    );
    expect(normalised.workforce.minimumServicemanShareBps).toBe(
      defaults.workforce.minimumServicemanShareBps
    );
    expect(normalised.workforce.recommendedServicemanShareBps).toBe(
      defaults.workforce.recommendedServicemanShareBps
    );
    expect(normalised.workforce.nonCustodialWallets).toBe(true);
    expect(normalised.workforce.complianceNarrative.length).toBeLessThanOrEqual(2000);
  });

  it('normalises workforce overrides within allowed bounds', () => {
    const normalised = normaliseMonetization({
      workforce: {
        providerControlsCompensation: false,
        minimumServicemanShareBps: 3500,
        recommendedServicemanShareBps: 9000,
        nonCustodialWallets: false,
        complianceNarrative: 'Providers handle payouts; platform ledger is double-entry reconciled.'
      }
    });

    expect(normalised.workforce.providerControlsCompensation).toBe(false);
    expect(normalised.workforce.minimumServicemanShareBps).toBe(3500);
    expect(normalised.workforce.recommendedServicemanShareBps).toBe(9000);
    expect(normalised.workforce.nonCustodialWallets).toBe(false);
    expect(normalised.workforce.complianceNarrative).toContain('double-entry');
  });
});
