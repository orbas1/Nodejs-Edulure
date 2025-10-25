import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/ReleaseOrchestrationService.js', () => ({
  default: {
    scheduleReleaseRun: vi.fn()
  }
}));

import ReleaseManagementController from '../src/controllers/ReleaseManagementController.js';
import releaseOrchestrationService from '../src/services/ReleaseOrchestrationService.js';

function createResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn()
  };
}

describe('ReleaseManagementController.scheduleRun', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalises environment names with spaces and mixed casing', async () => {
    releaseOrchestrationService.scheduleReleaseRun.mockResolvedValueOnce({ publicId: 'rel-1' });

    const req = {
      body: {
        versionTag: 'v1.2.3',
        environment: 'Prod Env',
        initiatedByEmail: 'ops@example.com'
      }
    };
    const res = createResponse();
    const next = vi.fn();

    await ReleaseManagementController.scheduleRun(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(releaseOrchestrationService.scheduleReleaseRun).toHaveBeenCalledWith(
      expect.objectContaining({ environment: 'prod-env' })
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
