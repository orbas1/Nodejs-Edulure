import { spawn } from 'node:child_process';
import process from 'node:process';
import readline from 'node:readline';

const COLOURS = {
  info: '\u001B[34m',
  success: '\u001B[32m',
  warn: '\u001B[33m',
  error: '\u001B[31m',
  reset: '\u001B[0m'
};

const DEFAULT_PRESET = 'lite';

const PRESET_DEFINITIONS = {
  lite: {
    targets: ['web'],
    jobGroups: ['core']
  },
  full: {
    targets: ['web', 'worker', 'realtime'],
    jobGroups: ['core', 'telemetry', 'monetisation']
  },
  'ads-analytics': {
    targets: ['web', 'worker', 'realtime'],
    jobGroups: ['core', 'analytics', 'ads']
  }
};

function toCsv(list) {
  return list.join(',');
}

export function derivePresetConfiguration(presetInput, { featureSnapshot = {}, explicitTargets, explicitJobGroups } = {}) {
  const preset = PRESET_DEFINITIONS[presetInput] ? presetInput : DEFAULT_PRESET;
  const definition = PRESET_DEFINITIONS[preset];

  const targets = explicitTargets?.length ? explicitTargets : [...definition.targets];
  const jobGroupSet = new Set(explicitJobGroups?.length ? explicitJobGroups : definition.jobGroups);

  const telemetryEnabled = featureSnapshot.telemetry ?? false;
  const monetisationEnabled = featureSnapshot.monetisation ?? false;
  const analyticsEnabled = featureSnapshot.analytics ?? false;
  const adsEnabled = featureSnapshot.ads ?? false;

  if (!telemetryEnabled) {
    jobGroupSet.delete('telemetry');
  }

  if (!monetisationEnabled) {
    jobGroupSet.delete('monetisation');
  }

  if (!analyticsEnabled) {
    jobGroupSet.delete('analytics');
  }

  if (!adsEnabled) {
    jobGroupSet.delete('ads');
  }

  const jobGroups = [...jobGroupSet];

  return {
    preset,
    targets,
    jobGroups,
    env: {
      SERVICE_PRESET: preset,
      SERVICE_TARGET: toCsv(targets),
      SERVICE_JOB_GROUPS: jobGroups.length ? toCsv(jobGroups) : undefined
    }
  };
}

function toLogObject(level, message, metadata, { supervisor, processName }) {
  const base = {
    timestamp: new Date().toISOString(),
    level,
    supervisor,
    message
  };

  if (processName) {
    base.process = processName;
  }

  if (metadata && Object.keys(metadata).length > 0) {
    base.metadata = metadata;
  }

  return base;
}

function colourise(level, text, { colorize }) {
  if (!colorize) {
    return text;
  }
  const colour = COLOURS[level] ?? COLOURS.info;
  return `${colour}${text}${COLOURS.reset}`;
}

function formatLogEntry(logObject, { format = 'ndjson', colorize = process.stdout.isTTY }) {
  if (format === 'ndjson') {
    return JSON.stringify(logObject);
  }

  const parts = [
    `[${logObject.timestamp}]`,
    logObject.supervisor,
    logObject.process ? `(${logObject.process})` : null,
    '-',
    logObject.message
  ].filter(Boolean);

  const headline = parts.join(' ');
  const colouredHeadline = colourise(logObject.level, headline, { colorize });
  const metadata = logObject.metadata ? `\n${JSON.stringify(logObject.metadata, null, 2)}` : '';
  return `${colouredHeadline}${metadata}`;
}

function createLogger({ name, logFormat = process.env.DEV_STACK_LOG_FORMAT ?? 'ndjson', colorize = process.stdout.isTTY }) {
  return {
    log(level, message, metadata = {}, processName) {
      const entry = toLogObject(level, message, metadata, { supervisor: name, processName });
      const output = formatLogEntry(entry, { format: logFormat, colorize });
      process.stdout.write(`${output}\n`);
    },
    info(message, metadata, processName) {
      this.log('info', message, metadata, processName);
    },
    success(message, metadata, processName) {
      this.log('success', message, metadata, processName);
    },
    warn(message, metadata, processName) {
      this.log('warn', message, metadata, processName);
    },
    error(message, metadata, processName) {
      this.log('error', message, metadata, processName);
    }
  };
}

function createSpawnOptions(options = {}) {
  const spawnOptions = {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options
  };
  return spawnOptions;
}

async function terminateChild(child, { signal = 'SIGINT', timeoutMs = 5000 } = {}) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGKILL');
      }
    }, timeoutMs);

    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });

    child.kill(signal);
  });
}

function normalizeReadinessResult(result) {
  if (result === null || result === undefined) {
    return { status: 'unknown' };
  }

  if (typeof result === 'boolean') {
    return { status: result ? 'ready' : 'pending' };
  }

  if (typeof result === 'string') {
    return { status: 'pending', message: result };
  }

  if (typeof result === 'object') {
    const status = result.status ?? (result.ok ? 'ready' : result.ready ? 'ready' : 'pending');
    const message = result.message ?? result.detail ?? result.description;
    return { status, message };
  }

  return { status: 'unknown' };
}

export function createProcessSupervisor({
  name = 'process-supervisor',
  logFormat,
  colorize = process.stdout.isTTY
} = {}) {
  const logger = createLogger({ name, logFormat, colorize });
  const processes = new Map();
  let shuttingDown = false;

  const supervisor = {
    logger,
    async runOnce(label, command, args, options = {}) {
      const spawnOptions = createSpawnOptions(options);
      logger.info(`Running ${label}`, { command, args });
      return new Promise((resolve, reject) => {
        const child = spawn(command, args, spawnOptions);

        child.on('exit', (code, signal) => {
          if (code === 0) {
            logger.success(`${label} completed`, { code, signal });
            resolve();
          } else {
            const reason = signal
              ? `${label} exited via signal ${signal}`
              : `${label} exited with code ${code}`;
            logger.error(reason, { code, signal });
            reject(new Error(reason));
          }
        });

        child.on('error', (error) => {
          logger.error(`${label} failed to spawn`, { error: error.message });
          reject(error);
        });
      });
    },

    spawnPersistent(label, command, args, options = {}) {
      if (processes.has(label)) {
        throw new Error(`Process with label "${label}" is already managed.`);
      }

      const spawnOptions = createSpawnOptions(options.spawnOptions);
      const state = {
        label,
        command,
        args,
        spawnOptions,
        readinessCheck: options.readinessCheck,
        readinessIntervalMs: options.readinessIntervalMs ?? 5000,
        readinessStatus: 'unknown',
        readinessMessage: undefined,
        child: null,
        restarts: 0,
        manualStop: false,
        destroyed: false
      };

      const scheduleReadinessProbe = (stateRef) => {
        let aborted = false;

        const evaluate = async () => {
          if (aborted || !stateRef.child) {
            return;
          }

          try {
            const result = await stateRef.readinessCheck();
            const normalized = normalizeReadinessResult(result);
            stateRef.readinessStatus = normalized.status;
            stateRef.readinessMessage = normalized.message;
            const level = normalized.status === 'ready' ? 'success' : 'warn';
            logger[level]('Readiness probe result', normalized, stateRef.label);
          } catch (error) {
            stateRef.readinessStatus = 'failed';
            stateRef.readinessMessage = error.message;
            logger.warn('Readiness probe failed', { error: error.message }, stateRef.label);
          }

          if (!aborted && stateRef.child) {
            setTimeout(evaluate, stateRef.readinessIntervalMs);
          }
        };

        evaluate();

        stateRef.cleanupReadiness = () => {
          aborted = true;
        };
      };

      const startProcess = () => {
        if (state.destroyed) {
          return;
        }

        logger.info('Starting process', { command, args }, label);
        const child = spawn(command, args, spawnOptions);
        state.child = child;
        state.manualStop = false;

        child.on('exit', (code, signal) => {
          state.child = null;
          state.readinessStatus = 'unknown';
          state.readinessMessage = undefined;
          const metadata = { code, signal, restarts: state.restarts };
          if (state.manualStop || shuttingDown) {
            logger.info('Process exited', metadata, label);
            return;
          }

          const reason = signal ? `signal ${signal}` : `code ${code}`;
          const level = code === 0 ? 'warn' : 'error';
          logger[level]('Process exited unexpectedly', { ...metadata, reason }, label);
        });

        child.on('error', (error) => {
          logger.error('Failed to spawn process', { error: error.message }, label);
        });

        if (typeof state.readinessCheck === 'function') {
          scheduleReadinessProbe(state);
        }
      };

      processes.set(label, { ...state, startProcess });
      startProcess();
    },

    async restart(label) {
      const state = processes.get(label);
      if (!state) {
        throw new Error(`Unknown process label "${label}"`);
      }

      logger.warn('Restart requested', { restarts: state.restarts + 1 }, label);
      state.manualStop = true;
      state.cleanupReadiness?.();
      await terminateChild(state.child, { signal: 'SIGTERM' }).catch(() => {});
      state.restarts += 1;
      state.startProcess();
    },

    async stopAll({ signal = 'SIGINT', code = 0 } = {}) {
      if (shuttingDown) {
        return;
      }
      shuttingDown = true;
      logger.info('Stopping all child processes', { signal });

      const stopPromises = [];
      for (const state of processes.values()) {
        state.manualStop = true;
        state.cleanupReadiness?.();
        if (state.child) {
          stopPromises.push(terminateChild(state.child, { signal }));
        }
      }

      await Promise.allSettled(stopPromises);
      if (code !== null) {
        process.exitCode = code;
      }
    },

    getSnapshot() {
      return Array.from(processes.values()).map((state) => ({
        label: state.label,
        command: state.command,
        args: state.args,
        restarts: state.restarts,
        readinessStatus: state.readinessStatus,
        readinessMessage: state.readinessMessage
      }));
    },

    attachCommandInterface({ enable = process.stdin.isTTY } = {}) {
      if (!enable) {
        return;
      }

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: `${name}> `
      });

      const renderStatus = () => {
        const snapshot = supervisor.getSnapshot();
        snapshot.forEach((item) => {
          const message = item.readinessMessage ? ` – ${item.readinessMessage}` : '';
          logger.info(`status: ${item.readinessStatus}${message}`, { restarts: item.restarts }, item.label);
        });
      };

      rl.on('line', async (line) => {
        const command = line.trim();
        if (!command) {
          rl.prompt();
          return;
        }

        const [keyword, ...rest] = command.split(/\s+/);
        if (['exit', 'quit'].includes(keyword)) {
          rl.close();
          supervisor.stopAll({ signal: 'SIGTERM', code: 0 }).finally(() => {
            process.exit(0);
          });
          return;
        }

        if (keyword === 'status') {
          renderStatus();
          rl.prompt();
          return;
        }

        if (['restart', 'rs'].includes(keyword)) {
          const label = rest[0];
          if (!label) {
            logger.warn('No process label supplied for restart command');
            rl.prompt();
            return;
          }

          supervisor
            .restart(label)
            .then(() => {
              logger.success('Process restart complete', {}, label);
            })
            .catch((error) => {
              logger.error('Failed to restart process', { error: error.message }, label);
            })
            .finally(() => {
              rl.prompt();
            });
          return;
        }

        logger.warn(`Unknown command "${command}". Supported commands: status, restart <label>, quit`);
        rl.prompt();
      });

      rl.on('close', () => {
        logger.info('Command interface closed');
      });

      rl.prompt();
    },

    registerSignalHandlers(signals = ['SIGINT', 'SIGTERM']) {
      const handle = (signal) => {
        logger.warn(`Received ${signal}, shutting down`);
        supervisor.stopAll({ signal, code: 0 }).finally(() => {
          process.exit(0);
        });
      };

      signals.forEach((signal) => {
        process.on(signal, () => handle(signal));
      });
    }
  };

  return supervisor;
}

export function parsePresetCli(args = []) {
  const options = {
    preset: DEFAULT_PRESET,
    skipDbInstall: false,
    skipFrontend: false,
    logFormat: process.env.DEV_STACK_LOG_FORMAT ?? 'ndjson',
    serviceTarget: undefined,
    serviceJobGroups: undefined
  };

  for (const token of args) {
    if (!token) {
      continue;
    }

    if (token === '--skip-db-install') {
      options.skipDbInstall = true;
      continue;
    }

    if (token === '--skip-frontend') {
      options.skipFrontend = true;
      continue;
    }

    if (token.startsWith('--preset=')) {
      const [, value] = token.split('=', 2);
      if (value) {
        options.preset = value;
      }
      continue;
    }

    if (token.startsWith('--log-format=')) {
      const [, value] = token.split('=', 2);
      if (value) {
        options.logFormat = value;
      }
      continue;
    }

    if (token.startsWith('--service-target=')) {
      const [, value] = token.split('=', 2);
      if (value) {
        options.serviceTarget = value;
      }
      continue;
    }

    if (token.startsWith('--service-job-groups=')) {
      const [, value] = token.split('=', 2);
      if (value) {
        options.serviceJobGroups = value;
      }
      continue;
    }
  }

  return options;
}

export function normalizeJobGroupInput(input) {
  if (!input) {
    return undefined;
  }
  const list = Array.isArray(input) ? input : String(input).split(',');
  return list
    .map((value) => value.trim())
    .filter(Boolean);
}

export function normalizeTargetInput(input) {
  if (!input) {
    return undefined;
  }
  const list = Array.isArray(input) ? input : String(input).split(',');
  return list
    .map((value) => value.trim())
    .filter(Boolean);
}
