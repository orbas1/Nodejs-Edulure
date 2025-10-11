import { describe, it, expect, vi } from 'vitest';

import { env } from '../src/config/env.js';
import { MailService } from '../src/services/MailService.js';

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
    expect(message.html).toContain(env.mail.verificationBaseUrl);
    expect(message.html).toContain('token-123');
    expect(message.text).toContain('token-123');
  });
});
