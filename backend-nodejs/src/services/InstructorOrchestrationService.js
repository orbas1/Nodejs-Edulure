import { randomUUID } from 'node:crypto';

import logger from '../config/logger.js';

const serviceLogger = logger.child({ module: 'instructor-orchestration-service' });

function normaliseArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.filter((entry) => Boolean(entry)).map((entry) => String(entry));
  }
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function deriveModuleBreakdown({ moduleCount = 6, outcomes = [] } = {}) {
  const resolvedModules = Number.parseInt(moduleCount, 10);
  const safeCount = Number.isFinite(resolvedModules) && resolvedModules > 0 ? resolvedModules : 6;
  return Array.from({ length: safeCount }).map((_, index) => ({
    id: `${index + 1}`.padStart(2, '0'),
    title: outcomes[index] ?? `Module ${index + 1}`,
    durationMinutes: 45,
    readinessScore: 50 + (index % 3) * 10
  }));
}

class InstructorOrchestrationService {
  async generateCourseOutline(userId, input = {}) {
    const correlationId = randomUUID();
    const modules = deriveModuleBreakdown(input);
    serviceLogger.info(
      {
        userId,
        correlationId,
        courseId: input.courseId ?? null,
        moduleCount: modules.length
      },
      'Instructor requested course outline generation'
    );
    return {
      correlationId,
      outlineId: `outline_${correlationId}`,
      modules,
      summary:
        input.topic
          ? `Generated outline for ${input.topic} with ${modules.length} modules.`
          : `Generated outline with ${modules.length} modules.`,
      requestedBy: userId
    };
  }

  async importFromNotion(userId, input = {}) {
    const correlationId = randomUUID();
    serviceLogger.info(
      {
        userId,
        correlationId,
        workspaceId: input.workspaceId ?? null,
        pageUrl: input.pageUrl ?? null
      },
      'Instructor triggered Notion import'
    );
    const importedSections = normaliseArray(input.sections);
    return {
      correlationId,
      importId: `notion_${correlationId}`,
      importedSections,
      recordsImported: importedSections.length || 1,
      summary: 'Notion content queued for ingestion.'
    };
  }

  async syncFromLms(userId, input = {}) {
    const correlationId = randomUUID();
    serviceLogger.info(
      {
        userId,
        correlationId,
        provider: input.provider ?? 'unknown',
        courseCode: input.courseCode ?? null
      },
      'Instructor requested LMS synchronisation'
    );
    return {
      correlationId,
      syncId: `lms_${correlationId}`,
      provider: input.provider ?? 'manual',
      syncedAt: new Date().toISOString(),
      summary: 'LMS synchronisation scheduled.'
    };
  }

  async routeTutorRequest(userId, input = {}) {
    const correlationId = randomUUID();
    serviceLogger.info(
      {
        userId,
        correlationId,
        queueSize: input.pendingCount ?? null
      },
      'Instructor recalibrated tutor routing rules'
    );
    return {
      correlationId,
      rulesetId: input.rulesetId ?? `routing_${correlationId}`,
      pendingAssignments: input.pendingCount ?? 0,
      summary: 'Tutor routing rules recalibrated.'
    };
  }

  async sendMentorInvite(userId, input = {}) {
    const correlationId = randomUUID();
    serviceLogger.info(
      {
        userId,
        correlationId,
        email: input.email ?? null
      },
      'Instructor issued mentor invite'
    );
    return {
      correlationId,
      inviteId: `invite_${correlationId}`,
      email: input.email ?? null,
      name: input.name ?? null,
      summary: 'Mentor invitation dispatched.'
    };
  }

  async exportPricing(userId, input = {}) {
    const correlationId = randomUUID();
    serviceLogger.info(
      {
        userId,
        correlationId,
        format: input.format ?? 'csv'
      },
      'Instructor initiated pricing export'
    );
    return {
      correlationId,
      exportId: `pricing_${correlationId}`,
      format: input.format ?? 'csv',
      downloadUrl: `/exports/pricing/${correlationId}.${(input.format ?? 'csv').toLowerCase()}`,
      summary: 'Pricing export is being prepared.'
    };
  }
}

const instructorOrchestrationService = new InstructorOrchestrationService();

export default instructorOrchestrationService;
