import nodemailer from 'nodemailer';

import { env } from '../config/env.js';
import logger from '../config/logger.js';

let sharedTransporter = null;

function getTransporter() {
  if (!sharedTransporter) {
    sharedTransporter = nodemailer.createTransport({
      host: env.mail.smtpHost,
      port: env.mail.smtpPort,
      secure: env.mail.smtpSecure,
      auth: {
        user: env.mail.smtpUser,
        pass: env.mail.smtpPassword
      }
    });
  }

  return sharedTransporter;
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

export class MailService {
  constructor(transporter = null) {
    this.transporter = transporter ?? getTransporter();
  }

  async sendMail(message) {
    const mail = {
      from: {
        name: env.mail.fromName,
        address: env.mail.fromEmail
      },
      ...message
    };

    const info = await this.transporter.sendMail(mail);
    logger.info({ messageId: info.messageId, to: message.to }, 'Email dispatched');
    return info;
  }

  async sendEmailVerification({ to, name, token, expiresAt }) {
    const verificationUrl = new URL(env.mail.verificationBaseUrl);
    verificationUrl.searchParams.set('token', token);

    return this.sendMail({
      to,
      subject: 'Confirm your Edulure account',
      html: buildVerificationHtml({ name, verificationUrl: verificationUrl.toString(), expiresAt }),
      text: buildVerificationText({ verificationUrl: verificationUrl.toString(), expiresAt })
    });
  }
}

export default new MailService();
