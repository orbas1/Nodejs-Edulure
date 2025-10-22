import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import logger from '../config/logger.js';
import { startWorkerService } from '../servers/workerService.js';
import { startRealtimeServer } from '../servers/realtimeServer.js';

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
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
        resolve({ code, output: output.join('') });
      } else {
        const error = new Error(`Command failed with exit code ${code}`);
        reject({ error, output: output.join(''), code });
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

class SetupOrchestratorService {
  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      id: null,
      status: 'idle',
      startedAt: null,
      completedAt: null,
      tasks: []
    };
    this.pendingEnvConfig = null;
  }

  getStatus() {
    return this.state;
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

  describeTaskState(descriptor) {
    return {
      id: descriptor.id,
      label: descriptor.label,
      status: 'pending',
      logs: [],
      startedAt: null,
      completedAt: null
    };
  }

  async startRun({ tasks, envConfig } = {}) {
    if (this.state.status === 'running') {
      throw new Error('A setup run is already in progress');
    }

    const taskIds = Array.isArray(tasks) && tasks.length ? tasks : DEFAULT_SETUP_TASK_SEQUENCE;
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

    this.state = {
      id: randomUUID(),
      status: 'running',
      startedAt: new Date().toISOString(),
      completedAt: null,
      tasks: descriptors.map((descriptor) => this.describeTaskState(descriptor))
    };
    this.pendingEnvConfig = envConfig ?? null;

    setImmediate(() => {
      this.execute(descriptors).catch((error) => {
        logger.error({ err: error }, 'Setup run failed');
      });
    });

    return this.state;
  }

  appendLog(index, message) {
    if (!this.state.tasks[index]) {
      return;
    }
    this.state.tasks[index].logs.push(message);
  }

  async execute(descriptors) {
    for (let index = 0; index < descriptors.length; index += 1) {
      const descriptor = descriptors[index];
      const taskState = this.state.tasks[index];
      taskState.status = 'running';
      taskState.startedAt = new Date().toISOString();
      try {
        const result = await descriptor.run();
        if (result?.output) {
          this.appendLog(index, result.output);
        }
        taskState.status = 'succeeded';
        taskState.completedAt = new Date().toISOString();
      } catch (errorOrResult) {
        const error = errorOrResult?.error ?? errorOrResult;
        taskState.status = 'failed';
        taskState.completedAt = new Date().toISOString();
        taskState.logs.push(errorOrResult?.output ?? error?.message ?? String(error));
        this.state.status = 'failed';
        this.state.completedAt = new Date().toISOString();
        this.pendingEnvConfig = null;
        return;
      }
    }

    this.state.status = 'succeeded';
    this.state.completedAt = new Date().toISOString();
    this.pendingEnvConfig = null;
  }
}

export const setupOrchestratorService = new SetupOrchestratorService();

export default setupOrchestratorService;
