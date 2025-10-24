import { beforeAll, describe, it, expect, vi } from 'vitest';

import './setupEnv.js';

let MailService;

beforeAll(async () => {
  ({ MailService } = await import('../src/services/MailService.js'));
});

describe('MailService', () => {
  it('sends verification emails with signed token link and platform branding', async () => {
    const sendMail = vi.fn(async () => ({ messageId: 'test-message-id' }));
    const service = new MailService({ sendMail });
    const expiresAt = new Date('2024-01-01T00:00:00Z');

    await service.sendEmailVerification({
      to: 'learner@example.com',
      name: 'Learner Example',
      token: 'token-123',
      expiresAt
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const message = sendMail.mock.calls[0][0];
    expect(message.to).toBe('learner@example.com');
    expect(message.subject).toBe('Confirm your Edulure account');
    expect(message.html).toContain('Learner Example');
    expect(message.html).toContain('https://app.local/verify-email');
    expect(message.html).toContain('token-123');
    expect(message.text).toContain('token-123');
  });

  it('sends magic link emails with secure call-to-action copy', async () => {
    const sendMail = vi.fn(async () => ({ messageId: 'magic-link-message-id' }));
    const service = new MailService({ sendMail });
    const expiresAt = new Date('2024-02-01T12:00:00Z');

    await service.sendMagicLink({
      to: 'passkey@example.com',
      name: 'Pass Key',
      magicLinkUrl: 'https://auth.edulure.com/magic?token=abc123',
      expiresAt
    });

    expect(sendMail).toHaveBeenCalledTimes(1);
    const message = sendMail.mock.calls[0][0];
    expect(message.to).toBe('passkey@example.com');
    expect(message.subject).toBe('Finish signing in to Edulure');
    expect(message.html).toContain('https://auth.edulure.com/magic?token=abc123');
    expect(message.text).toContain('https://auth.edulure.com/magic?token=abc123');
    expect(message.html).toContain('Pass Key');
    expect(message.headers['X-Edulure-Template']).toBe('magic-link-sign-in');
  });
});
