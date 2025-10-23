import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { EventEmitter } from 'node:events';

import logger from '../config/logger.js';
import SetupRunModel from '../models/SetupRunModel.js';
import SetupRunTaskModel from '../models/SetupRunTaskModel.js';
import { startWorkerService } from '../servers/workerService.js';
import { startRealtimeServer } from '../servers/realtimeServer.js';

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const DEFAULT_PRESET_ID = 'lite';
const HEARTBEAT_INTERVAL_MS = 5_000;

const clone = (value) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};
const TASK_DEFINITIONS = new Map([
  [
    'environment',
    {
      label: 'Write environment configuration',
      run(service) {
        return writeEnvironmentFiles(service.pendingEnvConfig);
      }
    }
  ],
  [
    'database',
    {
      label: 'Install database schema',
      run() {
        return runCommand('npm run db:install --workspace backend-nodejs');
      }
    }
  ],
  [
    'search',
    {
      label: 'Provision search cluster',
      run() {
        return runCommand('npm run search:provision --workspace backend-nodejs');
      }
    }
  ],
  [
    'backend',
    {
      label: 'Validate backend build',
      run() {
        return runCommand('npm run lint --workspace backend-nodejs');
      }
    }
  ],
  [
    'worker',
    {
      label: 'Warm background worker',
      run() {
        return runWorkerWarmup();
      }
    }
  ],
  [
    'realtime',
    {
      label: 'Warm realtime gateway',
      run() {
        return runRealtimeWarmup();
      }
    }
  ],
  [
    'frontend',
    {
      label: 'Build frontend assets',
      run() {
        return runCommand('npm run build --workspace frontend-reactjs');
      }
    }
  ]
]);

export const DEFAULT_SETUP_TASK_SEQUENCE = [
  'environment',
  'database',
  'search',
  'backend',
  'worker',
  'realtime',
  'frontend'
];

const PRESET_DEFINITIONS = new Map([
  [
    'lite',
    {
      id: 'lite',
      label: 'Lite preset',
      description: 'Web, background jobs, and Edulure Search for local installs.',
      tasks: ['environment', 'database', 'search', 'backend', 'frontend']
    }
  ],
  [
    'full',
    {
      id: 'full',
      label: 'Full preset',
      description: 'Complete stack with realtime and schedulers for staging parity.',
      tasks: [...DEFAULT_SETUP_TASK_SEQUENCE]
    }
  ],
  [
    'ads-analytics',
    {
      id: 'ads-analytics',
      label: 'Ads & analytics preset',
      description: 'Full stack tuned for monetisation experiments and telemetry.',
      tasks: [...DEFAULT_SETUP_TASK_SEQUENCE]
    }
  ]
]);

function runCommand(command, { cwd = projectRoot } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      env: process.env
    });
    const output = [];

    child.stdout.on('data', (chunk) => {
      const message = chunk.toString();
      output.push(message);
    });

    child.stderr.on('data', (chunk) => {
      const message = chunk.toString();
      output.push(message);
    });

    child.on('error', (error) => {
      reject({ error, output: output.join('') });
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ code, output: output.join(''), command });
      } else {
        const error = new Error(`Command failed with exit code ${code}`);
        reject({ error, output: output.join(''), code, command });
      }
    });
  });
}

async function waitForReadiness(readiness, timeoutMs = 15000) {
  const started = Date.now();
  while (!readiness.isReady()) {
    if (Date.now() - started > timeoutMs) {
      throw new Error('Service did not reach ready state within timeout');
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
  }
  return readiness.snapshot();
}

async function runWorkerWarmup() {
  const worker = await startWorkerService({ withSignalHandlers: false });
  try {
    await waitForReadiness(worker.readiness);
  } finally {
    await worker.stop().catch((error) => {
      logger.warn({ err: error }, 'Failed to stop worker service after warmup');
    });
  }
}

async function runRealtimeWarmup() {
  const realtime = await startRealtimeServer({ withSignalHandlers: false });
  try {
    await waitForReadiness(realtime.readiness);
  } finally {
    await realtime.stop().catch((error) => {
      logger.warn({ err: error }, 'Failed to stop realtime service after warmup');
    });
  }
}

function formatEnvEntries(entries = {}) {
  return Object.entries(entries)
    .filter(([key]) => typeof key === 'string' && key.trim().length > 0)
    .map(([key, value]) => `${key.trim()}=${value ?? ''}`)
    .join('\n');
}

async function writeEnvironmentFiles(envConfig = {}) {
  const backendEntries = formatEnvEntries(envConfig.backend ?? {});
  const frontendEntries = formatEnvEntries(envConfig.frontend ?? {});

  const tasks = [];
  if (backendEntries) {
    tasks.push(
      fs.writeFile(path.resolve(projectRoot, 'backend-nodejs', '.env.local'), `${backendEntries}\n`, 'utf8')
    );
  }
  if (frontendEntries) {
    tasks.push(
      fs.writeFile(path.resolve(projectRoot, 'frontend-reactjs', '.env.local'), `${frontendEntries}\n`, 'utf8')
    );
  }

  if (tasks.length === 0) {
    throw new Error('No environment configuration provided');
  }

  await Promise.all(tasks);
  return { backendWritten: Boolean(backendEntries), frontendWritten: Boolean(frontendEntries) };
}

class SetupOrchestratorService extends EventEmitter {
  constructor() {
    super();
    this.reset();
    setImmediate(() => {
      this.restoreFromHistory().catch((error) => {
        logger.error({ err: error }, 'Failed to restore setup orchestrator history');
      });
    });
  }

  reset() {
    this.clearHeartbeat();
    this.state = {
      id: null,
      status: 'idle',
      startedAt: null,
      completedAt: null,
      tasks: [],
      activePreset: null,
      lastPreset: null,
      lastError: null,
      heartbeatAt: null
    };
    this.pendingEnvConfig = null;
    this.currentRunRecord = null;
    this.runHistory = [];
    this.emitChange();
  }

  getStatus() {
    return clone(this.state);
  }

  getRecentRuns(limit = 10) {
    return this.runHistory.slice(0, limit).map((run) => clone(run));
  }

  buildTaskDescriptor(id) {
    const definition = TASK_DEFINITIONS.get(id);
    if (!definition) {
      throw new Error(`Unknown setup task "${id}"`);
    }

    return {
      id,
      label: definition.label,
      run: () => definition.run(this)
    };
  }

  listTaskIds() {
    return Array.from(TASK_DEFINITIONS.keys());
  }

  describeTasks() {
    return this.listTaskIds().map((id) => {
      const definition = TASK_DEFINITIONS.get(id);
      return {
        id,
        label: definition.label
      };
    });
  }

  listPresetIds() {
    return Array.from(PRESET_DEFINITIONS.keys());
  }

  describePresets() {
    return this.listPresetIds().map((id) => this.describePreset(id));
  }

  describePreset(id) {
    const preset = PRESET_DEFINITIONS.get(id);
    if (!preset) {
      throw new Error(`Unknown setup preset "${id}"`);
    }

    return {
      id: preset.id,
      label: preset.label,
      description: preset.description,
      tasks: [...preset.tasks]
    };
  }

  describeDefaults() {
    return {
      sequence: [...DEFAULT_SETUP_TASK_SEQUENCE],
      preset: DEFAULT_PRESET_ID
    };
  }

  async restoreFromHistory() {
    try {
      this.runHistory = await SetupRunModel.listRecent(10);
    } catch (error) {
      logger.error({ err: error }, 'Failed to load setup run history');
      this.runHistory = [];
    }

    const latestRun = this.runHistory[0] ?? null;
    if (!latestRun) {
      this.emitChange();
      return;
    }

    let tasks = [];
    try {
      tasks = await SetupRunTaskModel.listByRunId(latestRun.id);
    } catch (error) {
      logger.error({ err: error }, 'Failed to load setup run tasks');
    }

    const mappedTasks = tasks.map((task) => ({
      id: task.taskId,
      label: task.label,
      status: task.status,
      logs: task.logs,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      error: Object.keys(task.error ?? {}).length ? task.error : null
    }));

    if (latestRun.status === 'running') {
      const now = new Date().toISOString();
      const interruptionError = {
        message: 'Setup run interrupted due to service restart',
        command: null,
        exitCode: null,
        taskId: null
      };

      try {
        await SetupRunModel.updateByPublicId(latestRun.publicId, {
          status: 'failed',
          completedAt: now,
          heartbeatAt: now,
          lastError: interruptionError
        });
      } catch (error) {
        logger.error({ err: error }, 'Failed to mark interrupted setup run as failed');
      }

      await Promise.all(
        mappedTasks
          .filter((task) => task.status === 'pending' || task.status === 'running')
          .map(async (task) => {
            const updatedError = {
              message:
                task.status === 'pending'
                  ? 'Task was not executed before restart'
                  : 'Task interrupted due to service restart',
              command: task.error?.command ?? null,
              exitCode: task.error?.exitCode ?? null
            };
            try {
              await SetupRunTaskModel.updateByRunAndTask(latestRun.id, task.id, {
                status: 'failed',
                completedAt: now,
                error: { ...(task.error ?? {}), ...updatedError }
              });
            } catch (error) {
              logger.error({ err: error }, 'Failed to mark setup run task as interrupted');
            }
            task.status = 'failed';
            task.completedAt = now;
            task.error = { ...(task.error ?? {}), ...updatedError };
          })
      );

      this.state = {
        ...this.state,
        id: latestRun.publicId,
        status: 'failed',
        startedAt: latestRun.startedAt,
        completedAt: now,
        tasks: mappedTasks,
        activePreset: null,
        lastPreset: latestRun.presetId ?? null,
        lastError: interruptionError,
        heartbeatAt: now
      };
    } else {
      this.state = {
        ...this.state,
        id: latestRun.publicId,
        status: 'idle',
        startedAt: null,
        completedAt: latestRun.completedAt ?? null,
        tasks: mappedTasks,
        activePreset: null,
        lastPreset: latestRun.presetId ?? null,
        lastError: latestRun.lastError ?? null,
        heartbeatAt: latestRun.heartbeatAt ?? latestRun.completedAt ?? null
      };
    }

    this.emitChange();
  }

  describeTaskState(descriptor) {
    return {
      id: descriptor.id,
      label: descriptor.label,
      status: 'pending',
      logs: [],
      startedAt: null,
      completedAt: null,
      error: null
    };
  }

  resolvePresetTasks(presetId) {
    if (!presetId) {
      return null;
    }

    const preset = PRESET_DEFINITIONS.get(presetId);
    if (!preset) {
      throw new Error(`Unknown setup preset "${presetId}"`);
    }

    return [...preset.tasks];
  }

  async startRun({ tasks, envConfig, preset } = {}) {
    if (this.state.status === 'running') {
      throw new Error('A setup run is already in progress');
    }

    const presetTasks = this.resolvePresetTasks(preset);
    const taskIds = Array.isArray(tasks) && tasks.length ? tasks : presetTasks ?? DEFAULT_SETUP_TASK_SEQUENCE;
    const descriptors = taskIds.map((id) => {
      if (!TASK_DEFINITIONS.has(id)) {
        throw new Error(`Unknown setup task "${id}"`);
      }
      return this.buildTaskDescriptor(id);
    });

    const hasEnvironmentTask = descriptors.some((descriptor) => descriptor.id === 'environment');
    const hasEnvEntries =
      envConfig &&
      ((envConfig.backend && Object.keys(envConfig.backend).length > 0) ||
        (envConfig.frontend && Object.keys(envConfig.frontend).length > 0));

    if (hasEnvironmentTask && !hasEnvEntries) {
      throw new Error('Environment configuration is required when running the environment task');
    }

    const previousLastPreset = this.state.lastPreset ?? null;

    const runId = randomUUID();
    this.state = {
      id: runId,
      status: 'running',
      startedAt: new Date().toISOString(),
      completedAt: null,
      tasks: descriptors.map((descriptor) => this.describeTaskState(descriptor)),
      activePreset: preset ?? null,
      lastPreset: previousLastPreset,
      lastError: null,
      heartbeatAt: null
    };
    this.pendingEnvConfig = envConfig ?? null;

    this.updateHeartbeat();
    this.beginHeartbeat();
    this.emitChange();

    try {
      const createdRun = await SetupRunModel.create({
        publicId: runId,
        presetId: this.state.activePreset ?? null,
        status: 'running',
        startedAt: this.state.startedAt,
        heartbeatAt: this.state.heartbeatAt,
        metadata: {
          taskOrder: descriptors.map((descriptor) => descriptor.id)
        }
      });
      this.currentRunRecord = { id: createdRun.id, publicId: createdRun.publicId };
      await SetupRunTaskModel.createMany(
        createdRun.id,
        descriptors.map((descriptor, index) => ({
          taskId: descriptor.id,
          label: descriptor.label,
          orderIndex: index,
          status: 'pending',
          logs: [],
          error: {}
        }))
      );
      await this.refreshHistory();
    } catch (error) {
      logger.error({ err: error }, 'Failed to persist setup run metadata');
    }

    setImmediate(() => {
      this.execute(descriptors).catch((error) => {
        logger.error({ err: error }, 'Setup run failed');
      });
    });

    return this.getStatus();
  }

  async appendLog(index, message) {
    if (!this.state.tasks[index]) {
      return;
    }
    this.state.tasks[index].logs.push(message);
    this.emitChange();
    if (!this.currentRunRecord) {
      return;
    }

    try {
      await SetupRunTaskModel.appendLog(this.currentRunRecord.id, this.state.tasks[index].id, message);
    } catch (error) {
      logger.error({ err: error }, 'Failed to append setup task log');
    }
  }

  updateHeartbeat() {
    this.state.heartbeatAt = new Date().toISOString();
    if (this.currentRunRecord) {
      SetupRunModel.updateByPublicId(this.currentRunRecord.publicId, {
        heartbeatAt: this.state.heartbeatAt
      }).catch((error) => {
        logger.error({ err: error }, 'Failed to record setup run heartbeat');
      });
    }
  }

  beginHeartbeat() {
    this.clearHeartbeat();
    this.updateHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.updateHeartbeat();
      this.emitChange();
    }, HEARTBEAT_INTERVAL_MS);
  }

  clearHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  emitChange() {
    this.emit('state', this.getStatus());
  }

  async execute(descriptors) {
    for (let index = 0; index < descriptors.length; index += 1) {
      const descriptor = descriptors[index];
      const taskState = this.state.tasks[index];
      taskState.status = 'running';
      taskState.startedAt = new Date().toISOString();
      this.emitChange();
      if (this.currentRunRecord) {
        try {
          await SetupRunTaskModel.updateByRunAndTask(this.currentRunRecord.id, descriptor.id, {
            status: 'running',
            startedAt: taskState.startedAt
          });
        } catch (error) {
          logger.error({ err: error }, 'Failed to mark setup task as running');
        }
      }
      try {
        const result = await descriptor.run();
        if (result?.output) {
          await this.appendLog(index, result.output);
        }
        taskState.status = 'succeeded';
        taskState.completedAt = new Date().toISOString();
        taskState.error = null;
        this.emitChange();
        if (this.currentRunRecord) {
          try {
            await SetupRunTaskModel.updateByRunAndTask(this.currentRunRecord.id, descriptor.id, {
              status: 'succeeded',
              completedAt: taskState.completedAt,
              error: {}
            });
          } catch (error) {
            logger.error({ err: error }, 'Failed to mark setup task as succeeded');
          }
        }
      } catch (errorOrResult) {
        const error = errorOrResult?.error ?? errorOrResult;
        taskState.status = 'failed';
        taskState.completedAt = new Date().toISOString();
        const command = errorOrResult?.command ?? null;
        const exitCode = Number.isFinite(errorOrResult?.code) ? errorOrResult.code : null;
        const message = error?.message ?? String(error);
        const output = errorOrResult?.output ?? null;
        if (output) {
          taskState.logs.push(output);
        } else {
          taskState.logs.push(message);
        }
        taskState.error = {
          message,
          command,
          exitCode
        };
        this.state.status = 'failed';
        this.state.completedAt = new Date().toISOString();
        this.state.lastPreset = this.state.activePreset ?? this.state.lastPreset ?? null;
        this.state.lastError = {
          taskId: descriptor.id,
          command,
          exitCode,
          message
        };
        this.state.activePreset = null;
        this.pendingEnvConfig = null;
        this.clearHeartbeat();
        this.updateHeartbeat();
        this.emitChange();
        if (this.currentRunRecord) {
          try {
            await SetupRunTaskModel.updateByRunAndTask(this.currentRunRecord.id, descriptor.id, {
              status: 'failed',
              completedAt: taskState.completedAt,
              error: taskState.error,
              logs: taskState.logs
            });
          } catch (taskError) {
            logger.error({ err: taskError }, 'Failed to persist failed setup task state');
          }
          try {
            await SetupRunModel.updateByPublicId(this.currentRunRecord.publicId, {
              status: 'failed',
              completedAt: this.state.completedAt,
              heartbeatAt: this.state.heartbeatAt,
              lastError: this.state.lastError
            });
          } catch (runError) {
            logger.error({ err: runError }, 'Failed to persist failed setup run state');
          }
        }
        await this.refreshHistory();
        this.currentRunRecord = null;
        return;
      }
    }

    this.state.status = 'succeeded';
    this.state.completedAt = new Date().toISOString();
    this.state.lastPreset = this.state.activePreset ?? this.state.lastPreset ?? null;
    this.state.activePreset = null;
    this.state.lastError = null;
    this.pendingEnvConfig = null;
    this.clearHeartbeat();
    this.updateHeartbeat();
    this.emitChange();
    if (this.currentRunRecord) {
      try {
        await SetupRunModel.updateByPublicId(this.currentRunRecord.publicId, {
          status: 'succeeded',
          completedAt: this.state.completedAt,
          heartbeatAt: this.state.heartbeatAt,
          lastError: null
        });
      } catch (error) {
        logger.error({ err: error }, 'Failed to persist successful setup run state');
      }
      await this.refreshHistory();
    }
    this.currentRunRecord = null;
  }

  async refreshHistory() {
    try {
      this.runHistory = await SetupRunModel.listRecent(10);
    } catch (error) {
      logger.error({ err: error }, 'Failed to refresh setup run history');
    }
  }
}

export const setupOrchestratorService = new SetupOrchestratorService();

export default setupOrchestratorService;
