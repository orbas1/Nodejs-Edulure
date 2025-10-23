import { httpClient } from './httpClient.js';

export async function fetchUnifiedAuditLog({ token, limit, severity, since, signal, tenantId } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to load unified audit logs');
  }

  const params = {};
  if (limit !== undefined) {
    params.limit = limit;
  }
  if (severity) {
    params.severity = severity;
  }
  if (since) {
    params.since = since instanceof Date ? since.toISOString() : since;
  }
  if (tenantId) {
    params.tenantId = tenantId;
  }

  const response = await httpClient.get('/admin/audit/logs/unified', {
    token,
    params,
    signal,
    cache: { enabled: false }
  });

  return response?.data ?? response;
}

const auditLogApi = {
  fetchUnifiedAuditLog
};

export default auditLogApi;

