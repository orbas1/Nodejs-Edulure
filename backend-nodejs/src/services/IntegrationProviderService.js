import Stripe from 'stripe';
import {
  Client as PayPalClient,
  Environment as PayPalEnvironment,
  OrdersController,
  PaymentsController
} from '@paypal/paypal-server-sdk';

import { env } from '../config/env.js';
import logger from '../config/logger.js';
import { getRedisClient } from '../config/redisClient.js';
import IntegrationCircuitBreaker from '../integrations/IntegrationCircuitBreaker.js';
import StripeGateway from '../integrations/StripeGateway.js';
import PayPalGateway from '../integrations/PayPalGateway.js';
import CloudConvertClient from '../integrations/CloudConvertClient.js';
import TwilioMessagingClient from '../integrations/TwilioMessagingClient.js';
import IntegrationWebhookReceiptService from './IntegrationWebhookReceiptService.js';

const STRIPE_API_VERSION = '2024-06-20';

class IntegrationProviderService {
  static redisClient = env.redis.enabled ? getRedisClient() : null;

  static stripeGateway;

  static paypalGateway;

  static cloudConvertClient;

  static twilioClient;

  static buildCircuitBreaker(name, { failureThreshold, cooldownSeconds }) {
    const keyPrefix = env.redis.lockPrefix ?? 'edulure:locks';
    return new IntegrationCircuitBreaker({
      redisClient: this.redisClient,
      key: `${keyPrefix}:integration:${name}`,
      failureThreshold,
      cooldownMs: cooldownSeconds * 1000,
      logger: logger.child({ module: `${name}-circuit` })
    });
  }

  static getStripeGateway() {
    if (this.stripeGateway) {
      return this.stripeGateway;
    }

    const config = env.payments.stripe;
    const secretKey = config.mode === 'live'
      ? config.secretKey
      : config.sandboxSecretKey ?? config.secretKey;

    const webhookSecret = config.mode === 'live'
      ? config.webhookSecret
      : config.sandboxWebhookSecret ?? config.webhookSecret;

    const stripeClient = new Stripe(secretKey, {
      apiVersion: STRIPE_API_VERSION,
      appInfo: { name: 'Edulure Platform', version: '1.50.0' }
    });

    const circuitBreaker = this.buildCircuitBreaker('stripe', config.circuitBreaker);

    this.stripeGateway = new StripeGateway({
      stripeClient,
      webhookSecret,
      circuitBreaker,
      retry: config.retry,
      webhook: config.webhook,
      logger: logger.child({ module: 'stripe-gateway' }),
      receiptService: IntegrationWebhookReceiptService
    });

    return this.stripeGateway;
  }

  static getPayPalGateway() {
    if (this.paypalGateway) {
      return this.paypalGateway;
    }

    const config = env.payments.paypal;
    const mode = config.environment;
    const clientId = mode === 'live' ? config.clientId : config.sandboxClientId ?? config.clientId;
    const clientSecret =
      mode === 'live' ? config.clientSecret : config.sandboxClientSecret ?? config.clientSecret;

    const environment =
      mode === 'live'
        ? new PayPalEnvironment.Production(clientId, clientSecret)
        : new PayPalEnvironment.Sandbox(clientId, clientSecret);

    const client = new PayPalClient({ environment });
    const ordersController = new OrdersController(client);
    const paymentsController = new PaymentsController(client);
    const circuitBreaker = this.buildCircuitBreaker('paypal', config.circuitBreaker);

    this.paypalGateway = new PayPalGateway({
      ordersController,
      paymentsController,
      circuitBreaker,
      retry: config.retry,
      logger: logger.child({ module: 'paypal-gateway' })
    });

    return this.paypalGateway;
  }

  static getCloudConvertClient() {
    if (this.cloudConvertClient) {
      return this.cloudConvertClient;
    }

    const config = env.integrations.cloudConvert;
    if (!config?.apiKey && !config?.sandboxApiKey) {
      this.cloudConvertClient = null;
      return null;
    }

    const circuitBreaker = this.buildCircuitBreaker('cloudconvert', config.circuitBreaker);

    this.cloudConvertClient = new CloudConvertClient({
      apiKey: config.apiKey,
      sandboxApiKey: config.sandboxApiKey,
      sandboxMode: config.sandboxMode,
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
      retry: config.retry,
      circuitBreaker,
      logger: logger.child({ module: 'cloudconvert-client' })
    });

    return this.cloudConvertClient;
  }

  static getTwilioClient() {
    if (this.twilioClient) {
      return this.twilioClient;
    }

    const config = env.messaging.twilio;
    if (!config.accountSid || !config.authToken) {
      this.twilioClient = null;
      return null;
    }

    const circuitBreaker = this.buildCircuitBreaker('twilio', config.circuitBreaker);

    this.twilioClient = new TwilioMessagingClient({
      accountSid: config.accountSid,
      authToken: config.authToken,
      messagingServiceSid: config.messagingServiceSid,
      fromNumber: config.fromNumber,
      sandboxFromNumber: config.sandboxFromNumber,
      environment: config.environment,
      retry: config.retry,
      circuitBreaker,
      logger: logger.child({ module: 'twilio-client' })
    });

    return this.twilioClient;
  }
}

export default IntegrationProviderService;
