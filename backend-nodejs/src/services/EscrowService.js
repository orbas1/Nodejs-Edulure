import { env } from '../config/env.js';
import logger from '../config/logger.js';

const DEFAULT_BASE_URL = 'https://api.escrow.com/2017-09-01';

function normaliseParty(role, party) {
  if (!party?.email) {
    throw new Error(`Escrow ${role} email is required.`);
  }

  return {
    role,
    customer: {
      email: party.email,
      first_name: party.firstName ?? undefined,
      last_name: party.lastName ?? undefined,
      language: party.language ?? 'en'
    }
  };
}

function toCurrencyAmount(amountCents) {
  const cents = typeof amountCents === 'number' ? amountCents : Number(amountCents ?? 0);
  const safe = Number.isFinite(cents) && cents > 0 ? cents : 0;
  return Number((safe / 100).toFixed(2));
}

function buildMetadata(publicId, metadata) {
  const base = { platform_reference: publicId };
  if (!metadata) {
    return base;
  }

  try {
    return { ...base, ...metadata };
  } catch (_error) {
    return base;
  }
}

function getBaseUrl() {
  const configured = env.payments?.escrow?.baseUrl ?? DEFAULT_BASE_URL;
  return configured.replace(/\/$/, '');
}

function buildHeaders() {
  const apiKey = env.payments?.escrow?.apiKey;
  const apiSecret = env.payments?.escrow?.apiSecret;
  const credentials = Buffer.from(`${apiKey}:${apiSecret}`, 'utf8').toString('base64');
  return {
    Authorization: `Basic ${credentials}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (_error) {
    return { message: text };
  }
}

export default class EscrowService {
  static isConfigured() {
    return Boolean(env.payments?.escrow?.apiKey && env.payments?.escrow?.apiSecret);
  }

  static async createTransaction({
    publicId,
    amountCents,
    currency,
    description,
    buyer,
    seller,
    inspectionPeriod = 3,
    metadata
  }) {
    if (!this.isConfigured()) {
      throw new Error('Escrow.com integration is not configured.');
    }

    const amount = toCurrencyAmount(amountCents);
    if (amount <= 0) {
      const error = new Error('Escrow transactions must have a positive amount.');
      error.status = 422;
      throw error;
    }

    const payload = {
      currency: (currency ?? 'USD').toLowerCase(),
      description: description ?? 'Escrow transaction',
      metadata: buildMetadata(publicId, metadata?.monetization ?? metadata),
      items: [
        {
          description: description ?? 'Marketplace transaction',
          type: 'general_merchandise',
          inspection_period: Math.max(1, Math.min(Number(inspectionPeriod) || 1, 30)),
          schedule: [
            {
              amount,
              payer_customer: 'buyer',
              beneficiary_customer: 'seller'
            }
          ]
        }
      ],
      parties: [normaliseParty('buyer', buyer), normaliseParty('seller', seller)]
    };

    const endpoint = `${getBaseUrl()}/transactions`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(payload)
    });

    const responseBody = await parseResponse(response);
    if (!response.ok) {
      const error = new Error(responseBody?.message ?? 'Failed to create Escrow.com transaction');
      error.status = response.status;
      error.details = responseBody;
      throw error;
    }

    logger.info({ publicId, transactionId: responseBody?.id }, 'Created Escrow.com transaction');
    return responseBody;
  }
}
