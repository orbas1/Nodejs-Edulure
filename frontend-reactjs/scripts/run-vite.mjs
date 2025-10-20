import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const vitePackagePath = require.resolve('vite/package.json');
const viteBin = join(dirname(vitePackagePath), 'bin/vite.js');

const args = process.argv.slice(2);

const child = spawn(process.execPath, [viteBin, ...args], {
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error('[run-vite] Failed to start Vite:', error);
  process.exit(1);
});
