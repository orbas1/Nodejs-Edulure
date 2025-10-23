import { spawn } from 'node:child_process';
import process from 'node:process';

const DEFAULT_EXIT_TIMEOUT_MS = 5000;
const WINDOWS = process.platform === 'win32';

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normaliseLabel(label) {
  return typeof label === 'string' && label.trim().length ? label.trim() : 'process';
}

function createLogger({ scope, format = 'pretty', stream = process.stdout } = {}) {
  const label = scope ?? 'process-supervisor';

  return function log(event) {
    const payload = {
      timestamp: new Date().toISOString(),
      scope: label,
      ...event
    };

    if (format === 'ndjson') {
      stream.write(`${JSON.stringify(payload)}\n`);
      return;
    }

    const parts = [`[${label}]`];
    if (payload.label) {
      parts.push(payload.label);
    }
    if (payload.message) {
      parts.push(payload.message);
    } else if (payload.type) {
      parts.push(payload.type);
    }
    stream.write(`${parts.join(' ')}\n`);
  };
}

export function createProcessSupervisor({
  scope = 'dev-stack',
  format = 'pretty',
  exitTimeoutMs = DEFAULT_EXIT_TIMEOUT_MS,
  stream = process.stdout
} = {}) {
  const processes = new Map();
  let shuttingDown = false;

  const log = createLogger({ scope, format, stream });

  function createSpawnOptions(options = {}) {
    return {
      stdio: 'inherit',
      shell: WINDOWS,
      ...options
    };
  }

  async function runOnce({ label, command, args = [], options = {} }) {
    const spawnOptions = createSpawnOptions(options);
    const processLabel = normaliseLabel(label);

    log({ type: 'task:start', label: processLabel, message: `running ${command} ${args.join(' ')}` });

    return new Promise((resolve, reject) => {
      const child = spawn(command, toArray(args), spawnOptions);

      child.on('exit', (code, signal) => {
        if (code === 0) {
          log({ type: 'task:complete', label: processLabel, message: 'completed successfully' });
          resolve();
          return;
        }

        const reason = signal ? `signal ${signal}` : `exit code ${code}`;
        log({ type: 'task:error', label: processLabel, message: `failed with ${reason}` });
        reject(new Error(`${processLabel} failed with ${reason}`));
      });

      child.on('error', (error) => {
        log({ type: 'task:error', label: processLabel, message: error.message });
        reject(error);
      });
    });
  }

  function spawnChild(entry) {
    const { label, command, args, options } = entry;
    const spawnOptions = createSpawnOptions(options);

    log({ type: 'process:start', label, message: `spawning ${command} ${args.join(' ')}` });

    const child = spawn(command, toArray(args), spawnOptions);
    entry.child = child;

    child.on('exit', (code, signal) => {
      entry.child = null;

      if (entry.intent === 'restart') {
        entry.intent = null;
        log({
          type: 'process:stopped',
          label,
          message: `stopped for restart (code=${code ?? 'null'} signal=${signal ?? 'null'})`
        });
        return;
      }

      if (entry.intent === 'stop') {
        entry.intent = null;
        log({
          type: 'process:stopped',
          label,
          message: `terminated (code=${code ?? 'null'} signal=${signal ?? 'null'})`
        });
        return;
      }

      if (shuttingDown) {
        log({
          type: 'process:exit',
          label,
          message: `exited during shutdown (code=${code ?? 'null'} signal=${signal ?? 'null'})`
        });
        return;
      }

      shuttingDown = true;
      const reason = signal ? `signal ${signal}` : `code ${code}`;
      log({ type: 'process:crash', label, message: `exited unexpectedly with ${reason}` });

      shutdown({ exceptLabel: label }).finally(() => {
        process.exit(code ?? (signal ? 0 : 1));
      });
    });

    child.on('error', (error) => {
      if (entry.intent === 'restart' || entry.intent === 'stop' || shuttingDown) {
        log({ type: 'process:error', label, message: error.message });
        return;
      }
      shuttingDown = true;
      log({ type: 'process:error', label, message: error.message });
      shutdown({ exceptLabel: label }).finally(() => {
        process.exit(1);
      });
    });
  }

  function registerProcess({ label, command, args = [], options = {}, restartable = true }) {
    const processLabel = normaliseLabel(label);
    const entry = {
      label: processLabel,
      command,
      args,
      options,
      restartable,
      child: null,
      intent: null
    };

    processes.set(processLabel, entry);
    spawnChild(entry);
  }

  function getEntry(label) {
    const processLabel = normaliseLabel(label);
    const entry = processes.get(processLabel);
    if (!entry) {
      throw new Error(`No process registered with label "${processLabel}"`);
    }
    return entry;
  }

  function terminateChild(entry, signal = 'SIGINT') {
    if (!entry.child || entry.child.exitCode !== null || entry.child.signalCode !== null) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const child = entry.child;
      const timeout = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill('SIGKILL');
        }
      }, exitTimeoutMs);

      child.once('exit', () => {
        clearTimeout(timeout);
        resolve();
      });

      child.kill(signal);
    });
  }

  async function restart(label) {
    const entry = getEntry(label);
    if (!entry.restartable) {
      throw new Error(`Process "${entry.label}" is not restartable`);
    }

    log({ type: 'process:restart', label: entry.label, message: 'requested restart' });
    entry.intent = 'restart';
    await terminateChild(entry);
    spawnChild(entry);
    log({ type: 'process:restart-complete', label: entry.label, message: 'restart complete' });
  }

  async function shutdown({ exceptLabel } = {}) {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;

    const tasks = [];

    for (const entry of processes.values()) {
      if (exceptLabel && entry.label === normaliseLabel(exceptLabel)) {
        continue;
      }

      entry.intent = 'stop';
      tasks.push(terminateChild(entry));
    }

    await Promise.allSettled(tasks);
  }

  function listProcesses() {
    return Array.from(processes.keys());
  }

  return {
    runOnce,
    registerProcess,
    restart,
    shutdown,
    listProcesses,
    log,
    get isShuttingDown() {
      return shuttingDown;
    }
  };
}

export default createProcessSupervisor;
