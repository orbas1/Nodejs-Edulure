import { spawn } from 'node:child_process';
import { once } from 'node:events';
import process from 'node:process';
import readline from 'node:readline';
import { setTimeout as delay } from 'node:timers/promises';

const ANSI = {
  reset: '\u001B[0m',
  dim: '\u001B[2m',
  colours: {
    debug: '\u001B[90m',
    info: '\u001B[36m',
    success: '\u001B[32m',
    warn: '\u001B[33m',
    error: '\u001B[31m'
  }
};

const PRESET_ALIASES = new Map([
  ['analytics', 'ads-analytics'],
  ['adsanalytics', 'ads-analytics'],
  ['ads_analytics', 'ads-analytics'],
  ['ads', 'ads-analytics'],
  ['fullstack', 'full'],
  ['production', 'full']
]);

const PRESET_CONFIG = {
  lite: {
    id: 'lite',
    serviceTarget: 'web',
    jobGroups: 'core',
    enableJobs: false,
    enableRealtime: false,
    enableSearchRefresh: false
  },
  full: {
    id: 'full',
    serviceTarget: 'web,worker,realtime',
    jobGroups: 'core,monetisation,telemetry,analytics',
    enableJobs: true,
    enableRealtime: true,
    enableSearchRefresh: true
  },
  'ads-analytics': {
    id: 'ads-analytics',
    serviceTarget: 'web,worker',
    jobGroups: 'core,analytics',
    enableJobs: true,
    enableRealtime: false,
    enableSearchRefresh: true
  }
};

function formatJobGroups(value) {
  if (!value) {
    return '';
  }

  return Array.from(
    new Set(
      String(value)
        .split(',')
        .map((token) => token.trim())
        .filter(Boolean)
    )
  ).join(',');
}

function normalisePresetToken(rawPreset, fallback = 'lite') {
  if (!rawPreset) {
    return fallback;
  }

  const trimmed = String(rawPreset).trim().toLowerCase();
  const resolved = PRESET_ALIASES.get(trimmed) ?? trimmed;
  if (PRESET_CONFIG[resolved]) {
    return resolved;
  }

  return fallback;
}

function pickPreset(rawPreset, envPreset) {
  return normalisePresetToken(rawPreset ?? envPreset ?? 'lite');
}

function asBooleanString(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (['true', 'false'].includes(trimmed)) {
      return trimmed;
    }
  }

  return String(Boolean(value));
}

export function resolvePresetConfiguration(preset) {
  const resolved = normalisePresetToken(preset);
  return PRESET_CONFIG[resolved] ?? PRESET_CONFIG.lite;
}

export function createLifecycleLogger({ pretty = false, scope = 'supervisor' } = {}) {
  const formatPretty = (entry) => {
    const colour = ANSI.colours[entry.level] ?? ANSI.colours.info;
    const timestamp = `${ANSI.dim}${entry.timestamp}${ANSI.reset}`;
    const scopeLabel = `${ANSI.dim}[${scope}]${ANSI.reset}`;
    return `${colour}${entry.level.toUpperCase().padEnd(7)}${ANSI.reset} ${timestamp} ${scopeLabel} ${entry.message}`;
  };

  return {
    log(level, message, details = {}) {
      const entry = {
        timestamp: new Date().toISOString(),
        level,
        scope,
        message,
        ...details
      };

      const payload = pretty ? formatPretty(entry) : JSON.stringify(entry);
      const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
      stream.write(`${payload}\n`);
      return entry;
    }
  };
}

export function applyPresetDefaults({
  preset,
  env = process.env,
  mutate = true,
  overrides = {}
} = {}) {
  const resolvedPreset = pickPreset(preset, env.SERVICE_PRESET ?? env.RUNTIME_PRESET);
  const presetConfig = resolvePresetConfiguration(resolvedPreset);
  const target = mutate ? env : { ...env };

  if (!target.SERVICE_PRESET) {
    target.SERVICE_PRESET = presetConfig.id;
  }

  const resolvedServiceTarget = overrides.serviceTarget ?? target.SERVICE_TARGET ?? presetConfig.serviceTarget;
  target.SERVICE_TARGET = resolvedServiceTarget;

  const resolvedJobGroups = formatJobGroups(overrides.jobGroups ?? target.SERVICE_JOB_GROUPS ?? presetConfig.jobGroups);
  if (resolvedJobGroups) {
    target.SERVICE_JOB_GROUPS = resolvedJobGroups;
  }

  if (overrides.enableJobs !== undefined) {
    target.SERVICE_ENABLE_JOBS = asBooleanString(overrides.enableJobs);
  } else if (target.SERVICE_ENABLE_JOBS === undefined) {
    target.SERVICE_ENABLE_JOBS = asBooleanString(presetConfig.enableJobs);
  }

  if (overrides.enableRealtime !== undefined) {
    target.SERVICE_ENABLE_REALTIME = asBooleanString(overrides.enableRealtime);
  } else if (target.SERVICE_ENABLE_REALTIME === undefined) {
    target.SERVICE_ENABLE_REALTIME = asBooleanString(presetConfig.enableRealtime);
  }

  if (overrides.enableSearchRefresh !== undefined) {
    target.SERVICE_ENABLE_SEARCH_REFRESH = asBooleanString(overrides.enableSearchRefresh);
  } else if (target.SERVICE_ENABLE_SEARCH_REFRESH === undefined) {
    target.SERVICE_ENABLE_SEARCH_REFRESH = asBooleanString(presetConfig.enableSearchRefresh);
  }

  return {
    env: target,
    preset: presetConfig.id,
    config: presetConfig
  };
}

export function parsePresetArgs(args = [], { env = process.env } = {}) {
  let skipDbInstall = false;
  let skipFrontend = false;
  let prettyLogs = env.DEV_STACK_PRETTY_LOGS === '1';
  let presetToken = null;
  let serviceTarget = null;
  let jobGroups = null;

  const unknownArguments = [];

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token) {
      continue;
    }

    if (token === '--skip-db-install') {
      skipDbInstall = true;
      continue;
    }

    if (token === '--skip-frontend') {
      skipFrontend = true;
      continue;
    }

    if (token === '--pretty-logs') {
      prettyLogs = true;
      continue;
    }

    if (token === '--ndjson-logs') {
      prettyLogs = false;
      continue;
    }

    if (token === '--preset' && index + 1 < args.length) {
      presetToken = args[index + 1];
      index += 1;
      continue;
    }

    if (token.startsWith('--preset=')) {
      presetToken = token.split('=', 2)[1];
      continue;
    }

    if (token === '--service-target' && index + 1 < args.length) {
      serviceTarget = args[index + 1];
      index += 1;
      continue;
    }

    if (token.startsWith('--service-target=')) {
      serviceTarget = token.split('=', 2)[1];
      continue;
    }

    if (token === '--job-groups' && index + 1 < args.length) {
      jobGroups = args[index + 1];
      index += 1;
      continue;
    }

    if (token.startsWith('--job-groups=')) {
      jobGroups = token.split('=', 2)[1];
      continue;
    }

    unknownArguments.push(token);
  }

  const preset = pickPreset(presetToken, env.SERVICE_PRESET ?? env.RUNTIME_PRESET);

  const overrides = {};
  if (serviceTarget) {
    overrides.serviceTarget = serviceTarget;
  }
  if (jobGroups) {
    overrides.jobGroups = jobGroups;
  }

  return {
    preset,
    skipDbInstall,
    skipFrontend,
    prettyLogs,
    overrides,
    unknownArguments
  };
}

async function waitForHttpReadiness({ url, method = 'GET', headers, intervalMs = 1000, timeoutMs = 20000, signal }) {
  const start = Date.now();

  while (true) {
    if (signal?.aborted) {
      throw new Error('Readiness probe aborted');
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        signal
      });

      if (response.ok) {
        return;
      }
    } catch (error) {
      if (signal?.aborted) {
        throw new Error('Readiness probe aborted');
      }
    }

    if (Date.now() - start >= timeoutMs) {
      throw new Error(`Timed out waiting for readiness of ${url}`);
    }

    try {
      await delay(intervalMs, undefined, { signal });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('Readiness probe aborted');
      }
      throw error;
    }
  }
}

async function waitForReadiness(probe, { signal }) {
  if (!probe) {
    return;
  }

  if (probe.type === 'http') {
    await waitForHttpReadiness({ ...probe, signal });
    return;
  }

  throw new Error(`Unsupported readiness probe type "${probe.type}"`);
}

export function createProcessSupervisor({
  scope = 'process-supervisor',
  pretty = false,
  enableCommandInterface = false
} = {}) {
  const logger = createLifecycleLogger({ scope, pretty });
  const processes = new Map();
  let shuttingDown = false;
  let commandInterface = null;
  let signalHandlersRegistered = false;

  const describeProcessState = () =>
    Array.from(processes.values()).map((descriptor) => ({
      label: descriptor.label,
      status: descriptor.status,
      restarts: descriptor.restarts,
      pid: descriptor.child?.pid ?? null
    }));

  const cleanupInterface = () => {
    if (commandInterface) {
      commandInterface.close();
      commandInterface = null;
    }
  };

  const logStatus = () => {
    const summary = describeProcessState();
    logger.log('info', 'Process status summary', { processes: summary });
  };

  const stopChild = async (descriptor, { signal = 'SIGINT', timeoutMs = 5000 } = {}) => {
    if (!descriptor?.child) {
      return;
    }

    const { child } = descriptor;
    if (child.exitCode !== null || child.signalCode !== null) {
      return;
    }

    descriptor.status = 'stopping';
    child.kill(signal);

    const timer = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
      }
    }, timeoutMs);

    try {
      await once(child, 'exit');
    } finally {
      clearTimeout(timer);
    }
  };

  const stopAll = async ({ reason = 'manual' } = {}) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    cleanupInterface();
    logger.log('info', 'Stopping managed processes', { reason });

    const descriptors = Array.from(processes.values());
    for (const descriptor of descriptors) {
      await stopChild(descriptor).catch((error) => {
        logger.log('warn', 'Failed to stop process cleanly', { label: descriptor.label, error: error.message });
      });
    }
  };

  const restartProcess = async (label) => {
    const descriptor = processes.get(label);
    if (!descriptor) {
      logger.log('warn', 'Cannot restart unknown process', { label });
      return;
    }

    await stopChild(descriptor).catch((error) => {
      logger.log('warn', 'Failed to stop process before restart', { label, error: error.message });
    });

    descriptor.status = 'restarting';
    descriptor.restarts += 1;
    descriptor.spawn('manual');
  };

  const registerSignalHandlers = () => {
    if (signalHandlersRegistered) {
      return;
    }

    const handleTermination = (signal) => {
      logger.log('warn', 'Termination signal received', { signal });
      stopAll({ reason: `signal:${signal}` })
        .catch((error) => {
          logger.log('error', 'Failed to stop managed processes after termination signal', {
            signal,
            error: error.message
          });
        })
        .finally(() => {
          process.exit(0);
        });
    };

    ['SIGINT', 'SIGTERM'].forEach((signal) => {
      process.once(signal, () => handleTermination(signal));
    });

    signalHandlersRegistered = true;
  };

  const attachCommandInterface = () => {
    if (!enableCommandInterface || !process.stdin.isTTY) {
      return;
    }

    commandInterface = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: ''
    });

    logger.log('info', 'Interactive controls ready', {
      commands: ['status', 'restart <label>', 'stop <label>']
    });

    commandInterface.on('line', (line) => {
      const input = line.trim();
      if (!input) {
        return;
      }

      const [command, ...rest] = input.split(/\s+/);
      if (['status', ':status'].includes(command)) {
        logStatus();
        return;
      }

      if (['restart', ':restart'].includes(command)) {
        const label = rest[0];
        if (!label) {
          logger.log('warn', 'No process label supplied for restart command');
          return;
        }
        restartProcess(label);
        return;
      }

      if (['stop', ':stop'].includes(command)) {
        const label = rest[0];
        if (!label) {
          logger.log('warn', 'No process label supplied for stop command');
          return;
        }
        const descriptor = processes.get(label);
        if (!descriptor) {
          logger.log('warn', 'Cannot stop unknown process', { label });
          return;
        }
        stopChild(descriptor).catch((error) => {
          logger.log('warn', 'Failed to stop process', { label, error: error.message });
        });
        return;
      }

      if (['help', ':help'].includes(command)) {
        logger.log('info', 'Available commands', {
          commands: ['status', 'restart <label>', 'stop <label>']
        });
        return;
      }

      logger.log('warn', 'Unrecognised command', { input });
    });
  };

  const runOnce = ({ label, command, args = [], options = {} }) =>
    new Promise((resolve, reject) => {
      const spawnOptions = {
        stdio: 'inherit',
        shell: process.platform === 'win32',
        ...options
      };

      logger.log('info', 'Starting one-off command', { label, command, args });
      const child = spawn(command, args, spawnOptions);

      child.on('exit', (code, signal) => {
        if (code === 0) {
          logger.log('success', 'Command completed', { label });
          resolve();
          return;
        }

        const reason = signal
          ? `${label} exited via signal ${signal}`
          : `${label} exited with code ${code ?? '<unknown>'}`;
        logger.log('error', 'Command failed', { label, reason });
        reject(new Error(reason));
      });

      child.on('error', (error) => {
        logger.log('error', 'Failed to spawn command', { label, error: error.message });
        reject(error);
      });
    });

  const startProcess = ({
    label,
    command,
    args = [],
    options = {},
    exitOnFailure = false,
    readinessProbe = null
  }) => {
    if (!label) {
      throw new Error('Process label is required');
    }

    const spawnOptions = {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options
    };

    const descriptor = {
      label,
      command,
      args,
      options: spawnOptions,
      exitOnFailure,
      readinessProbe,
      restarts: 0,
      status: 'initialising',
      child: null,
      spawn: null
    };

    const doSpawn = (reason = 'initial') => {
      const child = spawn(command, args, spawnOptions);
      descriptor.child = child;
      descriptor.status = 'running';
      logger.log('info', 'Process spawned', { label, command, args, reason, pid: child.pid });

      const abortController = new AbortController();
      const { signal } = abortController;

      const readinessPromise = waitForReadiness(readinessProbe, { signal })
        .then(() => {
          logger.log('success', 'Readiness confirmed', { label });
        })
        .catch((error) => {
          if (signal.aborted) {
            return;
          }
          logger.log('warn', 'Readiness probe failed', { label, error: error.message });
        });

      child.on('exit', (code, signalCode) => {
        abortController.abort();
        descriptor.status = 'stopped';
        const outcome = signalCode
          ? `${label} stopped via signal ${signalCode}`
          : `${label} exited with code ${code ?? '<unknown>'}`;

        if (shuttingDown) {
          logger.log('info', 'Process stopped during shutdown', { label, outcome });
          return;
        }

        logger.log(code === 0 ? 'info' : 'warn', 'Process exited', {
          label,
          code,
          signal: signalCode,
          outcome
        });

        if (code !== 0 && exitOnFailure) {
          logger.log('error', 'Critical process exited unexpectedly', {
            label,
            code,
            signal: signalCode
          });
          stopAll({ reason: `failure:${label}` })
            .catch((error) => {
              logger.log('error', 'Failed to shut down after critical process exit', {
                label,
                error: error.message
              });
            })
            .finally(() => {
              process.exit(code ?? 1);
            });
        }
      });

      child.on('error', (error) => {
        abortController.abort();
        descriptor.status = 'failed';
        logger.log('error', 'Process failed to spawn', { label, error: error.message });
        if (exitOnFailure) {
          stopAll({ reason: `spawn-failure:${label}` })
            .catch((shutdownError) => {
              logger.log('error', 'Failed to stop processes after spawn error', {
                label,
                error: shutdownError.message
              });
            })
            .finally(() => {
              process.exit(1);
            });
        }
      });

      readinessPromise.catch(() => {
        // handled in catch block above but ensures unhandled rejection is avoided
      });
    };

    descriptor.spawn = doSpawn;
    processes.set(label, descriptor);
    doSpawn('initial');
    return descriptor;
  };

  attachCommandInterface();

  return {
    log: logger.log,
    processes,
    runOnce,
    startProcess,
    restartProcess,
    stopAll,
    registerSignalHandlers,
    describeProcessState
  };
}
