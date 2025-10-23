import db from '../config/database.js';
import logger from '../config/logger.js';
import CreationProjectChecklistItemModel from '../models/CreationProjectChecklistItemModel.js';

const log = logger.child({ service: 'CreationWorkspaceMaintenanceService' });

function cloneMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }
  return structuredClone(metadata);
}

function ensureEscalations(metadata) {
  if (!metadata.escalations || typeof metadata.escalations !== 'object') {
    metadata.escalations = {};
  }
  return metadata.escalations;
}

export async function runCreationWorkspaceMaintenance({
  warningThresholdHours = 48,
  escalationThresholdHours = 96,
  now = new Date(),
  connection = db
} = {}) {
  const warningHours = Number.isFinite(warningThresholdHours) ? warningThresholdHours : 48;
  const escalationHours = Number.isFinite(escalationThresholdHours) ? escalationThresholdHours : 96;
  const nowDate = new Date(now);
  const warningCutoff = new Date(nowDate.getTime() + warningHours * 60 * 60 * 1000);
  const escalationCutoff = new Date(nowDate.getTime() - escalationHours * 60 * 60 * 1000);
  const summary = { warningsElevated: 0, escalated: 0, blocked: 0 };

  const database = connection ?? db;

  await database.transaction(async (trx) => {
    const dueSoonRows = await trx('creation_project_checklist_items')
      .select('id', 'project_id', 'status', 'severity', 'metadata', 'due_at')
      .whereIn('status', ['pending', 'in_progress'])
      .andWhere('severity', 'info')
      .whereNotNull('due_at')
      .andWhere('due_at', '>', nowDate)
      .andWhere('due_at', '<=', warningCutoff);

    for (const row of dueSoonRows) {
      const entity = CreationProjectChecklistItemModel.deserialize(row);
      if (!entity) continue;
      const metadata = cloneMetadata(entity.metadata);
      const escalations = ensureEscalations(metadata);
      if (!escalations.warningAt) {
        escalations.warningAt = nowDate.toISOString();
      }
      escalations.warningWindowHours = warningHours;
      await CreationProjectChecklistItemModel.updateById(
        entity.id,
        {
          severity: 'warning',
          metadata
        },
        trx
      );
      summary.warningsElevated += 1;
    }

    const overdueRows = await trx('creation_project_checklist_items')
      .select('id', 'project_id', 'status', 'severity', 'metadata', 'due_at')
      .whereIn('status', ['pending', 'in_progress', 'blocked'])
      .whereNotNull('due_at')
      .andWhere('due_at', '<=', nowDate);

    for (const row of overdueRows) {
      const entity = CreationProjectChecklistItemModel.deserialize(row);
      if (!entity) continue;

      const dueTime = entity.dueAt ? new Date(entity.dueAt).getTime() : null;
      const metadata = cloneMetadata(entity.metadata);
      const escalations = ensureEscalations(metadata);
      let nextStatus = entity.status;
      let changed = false;

      if (entity.severity !== 'critical') {
        metadata.previousSeverity = entity.severity;
        changed = true;
      }

      if (!escalations.firstDetectedAt) {
        escalations.firstDetectedAt = entity.dueAt ?? nowDate.toISOString();
      }

      escalations.criticalAt = nowDate.toISOString();
      escalations.escalationWindowHours = escalationHours;

      if (dueTime !== null && dueTime <= escalationCutoff.getTime() && entity.status !== 'blocked') {
        nextStatus = 'blocked';
        summary.blocked += 1;
        changed = true;
      }

      if (changed || entity.severity !== 'critical') {
        await CreationProjectChecklistItemModel.updateById(
          entity.id,
          {
            status: nextStatus,
            severity: 'critical',
            metadata
          },
          trx
        );
        summary.escalated += 1;
      }
    }
  });

  log.debug({ ...summary, warningThresholdHours: warningHours, escalationThresholdHours: escalationHours }, 'Workspace maintenance run complete');
  return summary;
}

export default { runCreationWorkspaceMaintenance };
