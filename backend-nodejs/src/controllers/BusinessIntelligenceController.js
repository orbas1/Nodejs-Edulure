import { z } from 'zod';

import businessIntelligenceService from '../services/BusinessIntelligenceService.js';
import { success } from '../utils/httpResponse.js';

const overviewSchema = z.object({
  range: z
    .enum(['7d', '14d', '30d', '90d'])
    .default('30d')
});

function resolveTenantId(req) {
  if (req.headers['x-tenant-id']) {
    return String(req.headers['x-tenant-id']).trim();
  }
  if (req.user?.tenantId) {
    return req.user.tenantId;
  }
  return 'global';
}

export default class BusinessIntelligenceController {
  static async getExecutiveOverview(req, res, next) {
    try {
      const { range } = await overviewSchema.parseAsync(req.query ?? {});
      const tenantId = resolveTenantId(req);
      const overview = await businessIntelligenceService.getExecutiveOverview({ range, tenantId });
      return success(res, {
        data: overview,
        message: 'Executive analytics overview generated'
      });
    } catch (error) {
      return next(error);
    }
  }
}

