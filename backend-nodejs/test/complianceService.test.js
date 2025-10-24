import { beforeEach, describe, expect, it, vi } from 'vitest';

import ComplianceService from '../src/services/ComplianceService.js';
import { TABLES as COMPLIANCE_TABLES } from '../src/database/domains/compliance.js';

const changeDataCaptureMock = vi.hoisted(() => ({
  recordEvent: vi.fn()
}));

vi.mock('../src/services/ChangeDataCaptureService.js', () => ({
  default: changeDataCaptureMock
}));

function createKnexStub(initialData = {}) {
  const tableData = new Map(
    Object.entries(initialData).map(([table, rows]) => [table, rows.map((row) => ({ ...row }))])
  );

  function resolveTable(input) {
    if (typeof input === 'string') {
      return input;
    }
    if (input && typeof input === 'object') {
      const values = Object.values(input);
      return values.length ? values[0] : String(Object.keys(input)[0]);
    }
    return String(input);
  }

  function normaliseColumn(column) {
    if (typeof column !== 'string') {
      return column;
    }
    return column.includes('.') ? column.split('.').pop() : column;
  }

  function compare(actual, operator, expected) {
    switch (operator) {
      case '=':
      case '==':
        return actual === expected;
      case '!=':
        return actual !== expected;
      case '<':
        return actual < expected;
      case '<=':
        return actual <= expected;
      case '>':
        return actual > expected;
      case '>=':
        return actual >= expected;
      default:
        return actual === expected;
    }
  }

  function createQuery(tableName) {
    if (!tableData.has(tableName)) {
      tableData.set(tableName, []);
    }
    let rows = tableData.get(tableName);
    const conditions = [];

    function getFilteredRows() {
      return rows.filter((row) =>
        conditions.every((predicate) => predicate(row))
      );
    }

    function buildCondition(arg1, arg2, arg3) {
      if (typeof arg1 === 'object' && arg1 !== null) {
        const entries = Object.entries(arg1).map(([key, value]) => ({ key: normaliseColumn(key), value }));
        return (row) => entries.every(({ key, value }) => row[key] === value);
      }
      const column = normaliseColumn(arg1);
      if (arg3 === undefined) {
        return (row) => row[column] === arg2;
      }
      return (row) => compare(row[column], arg2, arg3);
    }

    const query = {
      select: () => query,
      innerJoin: () => query,
      leftJoin: () => query,
      orderBy: () => query,
      groupBy: () => query,
      limit: () => query,
      offset: () => query,
      modify: (callback) => {
        callback(query);
        return query;
      },
      where(arg1, arg2, arg3) {
        conditions.push(buildCondition(arg1, arg2, arg3));
        return query;
      },
      andWhere(arg1, arg2, arg3) {
        return query.where(arg1, arg2, arg3);
      },
      andWhereNull(column) {
        const key = normaliseColumn(column);
        conditions.push((row) => row[key] == null);
        return query;
      },
      count: async (aliases) => {
        const alias = Object.keys(aliases)[0];
        return [{ [alias]: getFilteredRows().length }];
      },
      then: (resolve) => resolve(getFilteredRows()),
      async first() {
        const [first] = getFilteredRows();
        return first ?? null;
      },
      async insert(payload) {
        const nextId = payload.id ?? Math.max(0, ...rows.map((row) => Number(row.id) || 0)) + 1;
        const row = { id: nextId, ...payload };
        rows = [...rows, row];
        tableData.set(tableName, rows);
        return [row.id];
      },
      async update(changes) {
        let count = 0;
        rows = rows.map((row) => {
          if (conditions.every((predicate) => predicate(row))) {
            count += 1;
            const updated = { ...row };
            for (const [key, value] of Object.entries(changes)) {
              if (value && typeof value === 'object' && 'sql' in value && Array.isArray(value.bindings)) {
                updated[key] = value.bindings[0];
              } else {
                updated[key] = value;
              }
            }
            return updated;
          }
          return row;
        });
        tableData.set(tableName, rows);
        return count;
      }
    };

    return query;
  }

  const knex = (input) => createQuery(resolveTable(input));
  knex.fn = { now: () => new Date('2024-02-01T00:00:00.000Z') };
  knex.raw = (sql, bindings) => ({ sql, bindings });
  knex.transaction = async (handler) => handler({});
  knex.__data = tableData;
  return knex;
}

describe('ComplianceService', () => {
  let auditLogger;
  let loggerStub;

  beforeEach(() => {
    changeDataCaptureMock.recordEvent.mockReset();
    auditLogger = { record: vi.fn() };
    loggerStub = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: () => loggerStub };
  });

  describe('DSR workflows', () => {
    let dsrModel;

    beforeEach(() => {
      dsrModel = {
        list: vi.fn().mockResolvedValue([{ id: 1 }]),
        count: vi.fn().mockResolvedValue(2),
        countOverdue: vi.fn().mockResolvedValue(1),
        assign: vi.fn().mockResolvedValue(1),
        updateStatus: vi.fn().mockResolvedValue(1),
        findById: vi.fn().mockResolvedValue({ id: 1, status: 'pending' })
      };
    });

    it('lists DSR requests through the model layer with counts', async () => {
      const connection = { fn: { now: vi.fn(() => new Date('2024-02-01T00:00:00Z')) } };
      const service = new ComplianceService({ connection, loggerInstance: loggerStub, auditLogger, dsrModel });

      const result = await service.listDsrRequests({ status: 'pending', limit: 5 });

      expect(dsrModel.list).toHaveBeenCalledWith({ status: 'pending', dueBefore: undefined, limit: 5, offset: 0 }, connection);
      expect(dsrModel.count).toHaveBeenCalledWith({ status: 'pending' }, connection);
      expect(dsrModel.countOverdue).toHaveBeenCalledWith(connection);
      expect(result).toEqual({ data: [{ id: 1 }], total: 2, overdue: 1 });
    });

    it('assigns a DSR request, records audit events, and returns the updated record', async () => {
      const connection = { fn: { now: vi.fn(() => new Date('2024-02-01T00:00:00Z')) } };
      const service = new ComplianceService({ connection, loggerInstance: loggerStub, auditLogger, dsrModel });

      const record = await service.assignDsrRequest({
        requestId: 1,
        assigneeId: 99,
        actor: { id: 7, role: 'admin', type: 'user' },
        requestContext: { requestId: 'req-1' }
      });

      expect(dsrModel.assign).toHaveBeenCalledWith({ requestId: 1, assigneeId: 99 }, connection);
      expect(auditLogger.record).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'dsr.assigned',
          entityId: 1
        })
      );
      expect(changeDataCaptureMock.recordEvent).toHaveBeenCalledWith({
        entityName: 'dsr_request',
        entityId: 1,
        operation: 'ASSIGN',
        payload: { assigneeId: 99 }
      });
      expect(record).toEqual({ id: 1, status: 'pending' });
    });

    it('updates a DSR status and emits CDC plus audit metadata', async () => {
      const connection = { fn: { now: vi.fn(() => new Date('2024-02-01T00:00:00Z')) } };
      const service = new ComplianceService({ connection, loggerInstance: loggerStub, auditLogger, dsrModel });

      dsrModel.findById.mockResolvedValue({ id: 1, status: 'completed' });

      const record = await service.updateDsrStatus({
        requestId: 1,
        status: 'completed',
        resolutionNotes: 'Export delivered',
        actor: { id: 7, role: 'admin', type: 'user' },
        requestContext: { requestId: 'req-1' }
      });

      expect(dsrModel.updateStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 1,
          status: 'completed',
          updates: expect.objectContaining({ closed_at: expect.any(Date) })
        }),
        connection
      );
      expect(auditLogger.record).toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'dsr.status_changed', entityId: 1 })
      );
      expect(changeDataCaptureMock.recordEvent).toHaveBeenCalledWith({
        entityName: 'dsr_request',
        entityId: 1,
        operation: 'STATUS',
        payload: { status: 'completed', resolutionNotes: 'Export delivered' }
      });
      expect(record).toEqual({ id: 1, status: 'completed' });
    });
  });

  it('summarises policy attestations and computes coverage by audience', async () => {
    const connection = createKnexStub({
      [COMPLIANCE_TABLES.CONSENT_POLICIES]: [
        {
          id: 1,
          policy_key: 'marketing.email',
          version: '1.0',
          status: 'published',
          summary: 'Email marketing consent',
          effective_at: '2024-01-01T00:00:00Z',
          metadata: JSON.stringify({ requiredRoles: ['user'] })
        }
      ],
      users: [
        { role: 'user', total: 5 },
        { role: 'instructor', total: 3 }
      ],
      [COMPLIANCE_TABLES.CONSENT_RECORDS]: [
        {
          consent_type: 'marketing.email',
          status: 'granted',
          channel: 'email',
          user_role: 'user',
          granted_at: '2024-01-10T00:00:00Z',
          active: 1,
          expires_at: '2024-02-20T00:00:00Z'
        },
        {
          consent_type: 'marketing.email',
          status: 'revoked',
          channel: 'web',
          user_role: 'instructor',
          granted_at: '2024-01-05T00:00:00Z',
          revoked_at: '2024-01-25T00:00:00Z',
          active: 0
        }
      ]
    });

    const service = new ComplianceService({ connection, loggerInstance: loggerStub, auditLogger });
    const summary = await service.summarisePolicyAttestations({ now: new Date('2024-02-01T00:00:00Z') });

    expect(summary.policies).toHaveLength(1);
    expect(summary.policies[0]).toMatchObject({
      consentType: 'marketing.email',
      granted: 1,
      revoked: 1,
      active: 1,
      expiringSoon: 1,
      coverage: 20
    });
    expect(summary.totals).toMatchObject({ required: 5, granted: 1, outstanding: 4, coverage: 20 });
  });

  it('creates consent records, emits audit events, and records CDC payloads', async () => {
    const connection = createKnexStub({
      [COMPLIANCE_TABLES.CONSENT_POLICIES]: [
        { id: 9, policy_key: 'marketing.email', version: '1.0', status: 'published', summary: 'Consent' }
      ],
      [COMPLIANCE_TABLES.CONSENT_RECORDS]: []
    });

    const service = new ComplianceService({ connection, loggerInstance: loggerStub, auditLogger });

    const record = await service.createConsentRecord({
      userId: 77,
      consentType: 'marketing.email',
      policyVersion: '1.0',
      channel: 'app',
      actor: { id: 77, role: 'user', type: 'user' },
      metadata: { source: 'settings' },
      requestContext: { requestId: 'req-123' }
    });

    expect(record).toMatchObject({
      user_id: 77,
      consent_type: 'marketing.email',
      policy_id: 9,
      channel: 'app'
    });
    expect(auditLogger.record).toHaveBeenCalledWith({
      eventType: 'consent.granted',
      entityType: 'consent_record',
      entityId: expect.any(String),
      actor: { id: 77, role: 'user', type: 'user' },
      metadata: expect.objectContaining({ consentType: 'marketing.email', channel: 'app' }),
      requestContext: { requestId: 'req-123' },
      tenantId: 'global'
    });
    expect(changeDataCaptureMock.recordEvent).toHaveBeenCalledWith({
      entityName: 'consent_record',
      entityId: expect.any(Number),
      operation: 'GRANT',
      payload: { consentType: 'marketing.email', policyVersion: '1.0', channel: 'app' }
    });

    const recordsTable = connection.__data.get(COMPLIANCE_TABLES.CONSENT_RECORDS);
    expect(recordsTable).toHaveLength(1);
    expect(recordsTable[0]).toMatchObject({
      user_id: 77,
      metadata: { source: 'settings' }
    });
  });
});
