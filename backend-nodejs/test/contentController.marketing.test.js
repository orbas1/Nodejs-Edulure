import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getLandingContent: vi.fn(),
  createMarketingLead: vi.fn()
}));

vi.mock('../src/services/MarketingContentService.js', () => ({
  default: {
    getLandingContent: mocks.getLandingContent,
    createMarketingLead: mocks.createMarketingLead
  }
}));

let ContentController;

function createMockResponse() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('ContentController marketing endpoints', () => {
  it('submits marketing lead payloads', async () => {
    ({ default: ContentController } = await import('../src/controllers/ContentController.js'));
    const req = { body: { email: 'lead@example.com', fullName: 'Jordan' } };
    const res = createMockResponse();
    const next = vi.fn();
    mocks.createMarketingLead.mockResolvedValue({ id: 1, email: 'lead@example.com' });

    await ContentController.createMarketingLead(req, res, next);

    expect(mocks.createMarketingLead).toHaveBeenCalledWith({
      email: 'lead@example.com',
      fullName: 'Jordan',
      company: undefined,
      persona: undefined,
      goal: undefined,
      ctaSource: undefined,
      blockSlug: undefined,
      metadata: {}
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      data: { id: 1, email: 'lead@example.com' },
      message: 'Lead captured'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects invalid marketing lead payloads', async () => {
    ({ default: ContentController } = await import('../src/controllers/ContentController.js'));
    const req = { body: { email: 'not-an-email' } };
    const res = createMockResponse();
    const next = vi.fn();

    await ContentController.createMarketingLead(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 422 }));
  });
});
