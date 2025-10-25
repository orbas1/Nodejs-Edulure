import nodemailer from 'nodemailer';

import { env } from '../config/env.js';
import logger from '../config/logger.js';

let sharedTransporter = null;

function resolveMailConfig() {
  const mailConfig = env.mail ?? {};
  const host = mailConfig.smtpHost ?? 'localhost';
  const port = Number(mailConfig.smtpPort ?? 587);
  const secure = Boolean(mailConfig.smtpSecure);
  const user = mailConfig.smtpUser ?? null;
  const pass = mailConfig.smtpPassword ?? null;

  const transport = { host, port, secure };

  if (user && pass) {
    transport.auth = { user, pass };
  }

  return transport;
}

function getTransporter() {
  if (!sharedTransporter) {
    sharedTransporter = nodemailer.createTransport(resolveMailConfig());
  }

  return sharedTransporter;
}

function validateEmailAddress(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return trimmed;
    }
  }

  throw Object.assign(new Error('A valid recipient email address is required'), { status: 422 });
}

function sanitizeHeaders(headers = {}) {
  return Object.entries(headers).reduce((acc, [key, value]) => {
    if (!key || value === undefined || value === null) {
      return acc;
    }
    const safeKey = String(key)
      .replace(/[^a-zA-Z0-9-]/g, '')
      .trim();
    if (!safeKey) {
      return acc;
    }
    acc[safeKey] = String(value).slice(0, 1024);
    return acc;
  }, {});
}

function buildVerificationHtml({ name, verificationUrl, expiresAt }) {
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Confirm your Edulure account</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #f8fafc; padding: 32px; color: #0f172a; }
        .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 24px 48px rgba(15, 23, 42, 0.12); }
        .cta { display: inline-block; margin-top: 24px; padding: 14px 28px; border-radius: 9999px; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; }
        p { line-height: 1.6; margin: 16px 0; }
        .meta { color: #475569; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Verify your email, ${name}</h1>
        <p>Thanks for creating your learning space with Edulure. One quick step before you explore courses, live classrooms, and communities: confirm this email belongs to you.</p>
        <p><a href="${verificationUrl}" class="cta">Confirm my email</a></p>
        <p>If the button above does not work, paste this link into your browser:</p>
        <p class="meta">${verificationUrl}</p>
        <p class="meta">This link expires on ${expiresAt.toUTCString()}. If you did not create an Edulure account, you can ignore this email.</p>
      </div>
    </body>
  </html>`;
}

function buildVerificationText({ verificationUrl, expiresAt }) {
  return [
    'Verify your Edulure account',
    '',
    'Thanks for creating your learning space with Edulure. Confirm this email belongs to you by visiting the link below:',
    verificationUrl,
    '',
    `The link expires on ${expiresAt.toUTCString()}. If you did not request this, you can safely ignore this email.`
  ].join('\n');
}

function buildTwoFactorHtml({ name, code, expiresAt }) {
  return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Your Edulure sign-in code</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #0f172a0f; padding: 32px; color: #0f172a; }
        .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 18px; padding: 32px; box-shadow: 0 24px 48px rgba(15, 23, 42, 0.12); }
        .code { display: inline-flex; gap: 12px; font-size: 28px; font-weight: 700; letter-spacing: 6px; background: #eff6ff; color: #1d4ed8; padding: 18px 24px; border-radius: 9999px; }
        .meta { color: #475569; font-size: 13px; }
        p { line-height: 1.6; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Hello ${name ?? 'there'},</h1>
        <p>Use the code below to finish signing in to Edulure. This extra step keeps your communities, courses, and creator tools secure.</p>
        <div class="code" role="presentation">${code.split('').join('&nbsp;')}</div>
        <p class="meta">The code expires at ${expiresAt.toUTCString()}. If you didn't try to sign in, you can ignore this message.</p>
      </div>
    </body>
  </html>`;
}

function buildTwoFactorText({ code, expiresAt }) {
  return [
    'Your Edulure sign-in code',
    '',
    `Code: ${code}`,
    '',
    `The code expires at ${expiresAt.toUTCString()}. If you did not try to sign in you can ignore this message.`
  ].join('\n');
}

export class MailService {
  constructor(transporter = null) {
    this.transporter = transporter ?? getTransporter();
  }

  async sendMail(message) {
    const mailConfig = env.mail ?? {};
    const mail = {
      from: {
        name: mailConfig.fromName ?? 'Edulure',
        address: mailConfig.fromEmail ?? 'no-reply@edulure.local'
      },
      ...message
    };

    if (mail.to) {
      if (Array.isArray(mail.to)) {
        mail.to = mail.to.map((recipient) =>
          typeof recipient === 'string'
            ? validateEmailAddress(recipient)
            : { ...recipient, address: validateEmailAddress(recipient.address) }
        );
      } else if (typeof mail.to === 'string') {
        mail.to = validateEmailAddress(mail.to);
      } else if (mail.to?.address) {
        mail.to = { ...mail.to, address: validateEmailAddress(mail.to.address) };
      }
    }

    if (mail.headers) {
      mail.headers = sanitizeHeaders(mail.headers);
    }

    const info = await this.transporter.sendMail(mail);
    logger.info({ messageId: info.messageId, to: message.to }, 'Email dispatched');
    return info;
  }

  async sendEmailVerification({ to, name, token, expiresAt }) {
    const mailConfig = env.mail ?? {};
    const verificationBase = mailConfig.verificationBaseUrl ?? 'https://edulure.local/email/verify';
    const verificationUrl = new URL(verificationBase);
    verificationUrl.searchParams.set('token', token);

    return this.sendMail({
      to,
      subject: 'Confirm your Edulure account',
      html: buildVerificationHtml({ name, verificationUrl: verificationUrl.toString(), expiresAt }),
      text: buildVerificationText({ verificationUrl: verificationUrl.toString(), expiresAt }),
      headers: sanitizeHeaders({ 'X-Edulure-Template': 'email-verification' })
    });
  }

  async sendTemplatedMail({ to, subject, templateId, variables = {}, headers = {} }) {
    const payload = {
      to: validateEmailAddress(to),
      subject,
      headers: sanitizeHeaders({ ...headers, 'X-Edulure-Template': templateId })
    };

    if (!templateId) {
      throw Object.assign(new Error('Template identifier is required'), { status: 422 });
    }

    const body = JSON.stringify({ templateId, variables });
    payload.text = body;
    payload.html = `<pre>${body.replace(/</g, '&lt;')}</pre>`;

    return this.sendMail(payload);
  }

  async sendTwoFactorCode({ to, name, code, expiresAt }) {
    return this.sendMail({
      to,
      subject: 'Your Edulure sign-in code',
      html: buildTwoFactorHtml({ name, code, expiresAt }),
      text: buildTwoFactorText({ code, expiresAt }),
      headers: sanitizeHeaders({ 'X-Edulure-Template': 'two-factor-email-otp' })
    });
  }
}

export default new MailService();
