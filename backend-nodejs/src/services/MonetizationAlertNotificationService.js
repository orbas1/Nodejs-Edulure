import { env } from '../config/env.js';
import logger from '../config/logger.js';
import mailService from './MailService.js';
import { centsToCurrencyString, normalizeCurrencyCode } from '../utils/currency.js';

function defaultHttpClient() {
  return typeof fetch === 'function' ? fetch.bind(globalThis) : null;
}

function formatMoney(cents, currencyCode) {
  const value = centsToCurrencyString(Number(cents ?? 0));
  const sign = Number(cents ?? 0) < 0 ? '-' : '';
  return `${sign}${currencyCode} ${value.replace('-', '')}`;
}

function buildAlertLines(alerts = []) {
  return alerts.map((alert) => {
    const severity = (alert.severity ?? 'info').toString().toUpperCase();
    const message = alert.message ?? 'Variance detected';
    const action = alert.suggestedAction ? ` — ${alert.suggestedAction}` : '';
    return `• [${severity}] ${message}${action}`;
  });
}

export default class MonetizationAlertNotificationService {
  constructor({
    mailer = mailService,
    httpClient = defaultHttpClient(),
    config = env.monetization?.reconciliation?.notifications ?? {}
  } = {}) {
    this.mailer = mailer;
    this.httpClient = httpClient;
    this.config = config ?? {};
    this.logger = logger.child({ module: 'monetization-alert-notifier' });
    this.currencyCode = normalizeCurrencyCode(null, env.payments?.defaultCurrency ?? 'USD');
  }

  hasChannels() {
    return (
      (Array.isArray(this.config.emailRecipients) && this.config.emailRecipients.length > 0) ||
      Boolean(this.config.slackWebhookUrl)
    );
  }

  async dispatch({ run, evaluation, digest }) {
    if (!run || !evaluation || !Array.isArray(evaluation.alerts) || evaluation.alerts.length === 0) {
      return { channels: [], sentAt: new Date().toISOString(), recipients: {} };
    }

    const sentAt = new Date().toISOString();
    const channels = [];
    const recipients = {};

    if (Array.isArray(this.config.emailRecipients) && this.config.emailRecipients.length > 0) {
      try {
        const emailPayload = this.buildEmailPayload({ run, evaluation, digest, sentAt });
        await this.mailer.sendMail(emailPayload);
        channels.push('email');
        recipients.email = [...this.config.emailRecipients];
      } catch (error) {
        this.logger.error({ err: error, runId: run.id }, 'Failed to dispatch monetization alert email');
      }
    }

    if (this.config.slackWebhookUrl && this.httpClient) {
      try {
        const slackPayload = this.buildSlackPayload({ run, evaluation, digest, sentAt });
        const response = await this.httpClient(this.config.slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload)
        });
        if (!response?.ok) {
          const text = await response?.text?.();
          throw new Error(`Slack webhook responded with status ${response.status}: ${text ?? 'unknown error'}`);
        }
        channels.push('slack');
      } catch (error) {
        this.logger.error({ err: error, runId: run.id }, 'Failed to dispatch monetization alert Slack notification');
      }
    }

    return { channels, sentAt, recipients, digest };
  }

  buildEmailPayload({ run, evaluation, digest, sentAt }) {
    const subject =
      this.config.emailSubject ?? `Finance reconciliation alert (${evaluation.severity?.toUpperCase() ?? 'ALERT'})`;
    const ackUrl = this.resolveAcknowledgementUrl(run?.id);
    const alertLines = buildAlertLines(evaluation.alerts);
    const currency = this.currencyCode;
    const bodyLines = [
      `Finance reconciliation for tenant ${run?.tenantId ?? 'global'} surfaced ${alertLines.length} alert${
        alertLines.length === 1 ? '' : 's'
      }.`,
      `Window: ${run?.windowStart ?? 'n/a'} → ${run?.windowEnd ?? 'n/a'}.`,
      `Variance (recognised vs invoiced): ${formatMoney(run?.varianceCents ?? 0, currency)} (${(
        evaluation.varianceBps ?? 0
      ) / 100}% bps).`,
      `Usage variance: ${evaluation.usageVarianceBps ?? 0} bps.`
    ];

    const textParts = [
      subject,
      '',
      ...bodyLines,
      '',
      ...alertLines,
      ''
    ];

    if (ackUrl) {
      textParts.push(`Acknowledge or investigate: ${ackUrl}`);
    }

    textParts.push(`Run ID: ${run?.id ?? 'n/a'}`);
    textParts.push(`Generated at: ${sentAt}`);

    const htmlLines = bodyLines.map((line) => `<p>${line}</p>`);
    if (alertLines.length) {
      htmlLines.push('<ul>');
      for (const line of alertLines) {
        htmlLines.push(`<li>${line.slice(2)}</li>`);
      }
      htmlLines.push('</ul>');
    }
    if (ackUrl) {
      htmlLines.push(`<p><strong>Acknowledge:</strong> <a href="${ackUrl}">${ackUrl}</a></p>`);
    }
    htmlLines.push(`<p>Run ID: ${run?.id ?? 'n/a'}</p>`);
    htmlLines.push(`<p>Generated at: ${sentAt}</p>`);

    return {
      to: this.config.emailRecipients,
      subject,
      html: htmlLines.join('\n'),
      text: textParts.join('\n'),
      headers: {
        'X-Edulure-Alert-Digest': digest ?? 'none',
        'X-Edulure-Alert-Tenant': run?.tenantId ?? 'global'
      }
    };
  }

  buildSlackPayload({ run, evaluation, digest, sentAt }) {
    const severity = evaluation.severity?.toUpperCase() ?? 'ATTENTION';
    const alertLines = buildAlertLines(evaluation.alerts);
    const ackUrl = this.resolveAcknowledgementUrl(run?.id);
    const textParts = [
      `*Finance reconciliation alert* (${severity}) for tenant *${run?.tenantId ?? 'global'}*`,
      `Window: ${run?.windowStart ?? 'n/a'} → ${run?.windowEnd ?? 'n/a'}`,
      `Variance: ${formatMoney(run?.varianceCents ?? 0, this.currencyCode)} (${(
        evaluation.varianceBps ?? 0
      ) / 100}% bps)`
    ];
    if (typeof evaluation.usageVarianceBps === 'number') {
      textParts.push(`Usage variance: ${evaluation.usageVarianceBps} bps`);
    }
    if (alertLines.length) {
      textParts.push('', ...alertLines);
    }
    if (ackUrl) {
      textParts.push('', `Acknowledge: ${ackUrl}`);
    }
    textParts.push('', `Digest: ${digest ?? 'none'}`, `Run: ${run?.id ?? 'n/a'}`, `Generated: ${sentAt}`);

    return { text: textParts.join('\n') };
  }

  resolveAcknowledgementUrl(runId) {
    if (!this.config.acknowledgementUrl) {
      return null;
    }
    const base = String(this.config.acknowledgementUrl).trim();
    if (!base) {
      return null;
    }
    const normalised = base.endsWith('/') ? base.slice(0, -1) : base;
    return runId ? `${normalised}/${runId}` : normalised;
  }
}
