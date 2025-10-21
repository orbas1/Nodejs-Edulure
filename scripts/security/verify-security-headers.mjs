#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

function parseArgs(rawArgs) {
  const options = {
    url: process.env.ZAP_TARGET_URL ?? process.env.TARGET_URL ?? null,
    output: path.join(repoRoot, 'reports', 'security', 'zap-header-validation.json'),
    retries: 3,
    timeout: 10000
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const token = rawArgs[index];
    switch (token) {
      case '--url':
      case '-u': {
        const value = rawArgs[index + 1];
        if (!value) {
          throw new Error('Missing value for --url option.');
        }
        options.url = value;
        index += 1;
        break;
      }
      case '--output':
      case '-o': {
        const value = rawArgs[index + 1];
        if (!value) {
          throw new Error('Missing value for --output option.');
        }
        options.output = path.isAbsolute(value) ? value : path.join(repoRoot, value);
        index += 1;
        break;
      }
      case '--retries': {
        const value = rawArgs[index + 1];
        if (!value || Number.isNaN(Number.parseInt(value, 10))) {
          throw new Error('Missing or invalid value for --retries option.');
        }
        options.retries = Math.max(1, Number.parseInt(value, 10));
        index += 1;
        break;
      }
      case '--timeout': {
        const value = rawArgs[index + 1];
        if (!value || Number.isNaN(Number.parseInt(value, 10))) {
          throw new Error('Missing or invalid value for --timeout option (milliseconds).');
        }
        options.timeout = Math.max(1000, Number.parseInt(value, 10));
        index += 1;
        break;
      }
      default:
        throw new Error(`Unknown argument '${token}'. Supported options: --url, --output, --retries, --timeout.`);
    }
  }

  if (!options.url) {
    throw new Error('A target URL must be provided via --url or ZAP_TARGET_URL environment variable.');
  }

  try {
    // Validate URL format early and normalise
    const parsed = new URL(options.url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Only http and https schemes are supported.');
    }
    options.url = parsed.toString();
  } catch (error) {
    throw new Error(`Invalid target URL '${options.url}': ${error.message}`);
  }

  return options;
}

async function fetchWithRetries(url, { retries, timeout }) {
  let attempt = 0;
  let lastError = null;
  while (attempt < retries) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': 'edulure-zap-header-validator/1.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          signal: controller.signal
        });
        return response;
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (attempt < retries) {
        const backoffMs = Math.min(2000 * attempt, 5000);
        await new Promise((resolve) => {
          setTimeout(resolve, backoffMs);
        });
      }
    }
  }

  throw lastError ?? new Error('Failed to retrieve target URL.');
}

function normaliseHeaderName(name) {
  return name.toLowerCase();
}

function evaluateHeaders(headers) {
  const checks = [
    {
      id: 'content-security-policy',
      name: 'Content-Security-Policy',
      severity: 'error',
      validate(value) {
        if (!value) {
          return 'Header missing.';
        }
        if (!/default-src/i.test(value)) {
          return 'CSP must declare a default-src directive.';
        }
        if (/unsafe-inline/i.test(value) || /unsafe-eval/i.test(value)) {
          return 'CSP must not include unsafe-inline or unsafe-eval directives.';
        }
        return null;
      }
    },
    {
      id: 'strict-transport-security',
      name: 'Strict-Transport-Security',
      severity: 'error',
      validate(value) {
        if (!value) {
          return 'Header missing.';
        }
        const match = value.match(/max-age=(\d+)/i);
        if (!match) {
          return 'Strict-Transport-Security must include a max-age directive.';
        }
        const maxAge = Number.parseInt(match[1], 10);
        if (!Number.isFinite(maxAge) || maxAge < 31536000) {
          return 'Strict-Transport-Security max-age must be at least 31536000.';
        }
        if (!/includesubdomains/i.test(value)) {
          return 'Strict-Transport-Security must include includeSubDomains.';
        }
        return null;
      }
    },
    {
      id: 'referrer-policy',
      name: 'Referrer-Policy',
      severity: 'error',
      validate(value) {
        if (!value) {
          return 'Header missing.';
        }
        const normalised = value.toLowerCase();
        const allowed = new Set([
          'no-referrer',
          'no-referrer-when-downgrade',
          'same-origin',
          'strict-origin',
          'strict-origin-when-cross-origin'
        ]);
        if (!allowed.has(normalised)) {
          return `Unexpected Referrer-Policy value '${value}'.`;
        }
        return null;
      }
    },
    {
      id: 'x-content-type-options',
      name: 'X-Content-Type-Options',
      severity: 'error',
      validate(value) {
        if (!value) {
          return 'Header missing.';
        }
        if (value.trim().toLowerCase() !== 'nosniff') {
          return 'X-Content-Type-Options must be set to nosniff.';
        }
        return null;
      }
    },
    {
      id: 'x-frame-options',
      name: 'X-Frame-Options',
      severity: 'warning',
      validate(value) {
        if (!value) {
          return 'Header missing.';
        }
        const normalised = value.trim().toUpperCase();
        if (!['DENY', 'SAMEORIGIN'].includes(normalised)) {
          return `Unexpected X-Frame-Options value '${value}'.`;
        }
        return null;
      }
    }
  ];

  const results = [];
  const headerMap = new Map();
  for (const [name, value] of headers.entries()) {
    headerMap.set(normaliseHeaderName(name), value);
  }

  for (const check of checks) {
    const headerValue = headerMap.get(check.id) ?? headerMap.get(normaliseHeaderName(check.name));
    const message = check.validate(headerValue ?? '');
    results.push({
      id: check.id,
      name: check.name,
      severity: check.severity,
      passed: message == null,
      message: message ?? 'OK',
      observedValue: headerValue ?? null
    });
  }

  return results;
}

function summariseResults(results) {
  const errors = results.filter((check) => !check.passed && check.severity === 'error');
  const warnings = results.filter((check) => !check.passed && check.severity !== 'error');
  return { errors, warnings };
}

async function writeReport({ output, data }) {
  const directory = path.dirname(output);
  await mkdir(directory, { recursive: true });
  await writeFile(output, JSON.stringify(data, null, 2));
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`\n❌  ${error.message}`);
    process.exit(1);
  }

  console.log(`🔍 Validating security headers for ${options.url}`);

  let response;
  try {
    response = await fetchWithRetries(options.url, { retries: options.retries, timeout: options.timeout });
  } catch (error) {
    console.error(`❌  Failed to retrieve ${options.url}: ${error.message}`);
    process.exit(1);
  }

  const results = evaluateHeaders(response.headers);
  const summary = summariseResults(results);

  const report = {
    generatedAt: new Date().toISOString(),
    targetUrl: options.url,
    finalUrl: response.url,
    status: summary.errors.length === 0 ? 'passed' : 'failed',
    httpStatus: response.status,
    checks: results
  };

  try {
    await writeReport({ output: options.output, data: report });
    console.log(`📝 Report written to ${path.relative(repoRoot, options.output)}`);
  } catch (error) {
    console.warn(`⚠️  Failed to persist security header report: ${error.message}`);
  }

  for (const result of results) {
    const statusIcon = result.passed ? '✅' : result.severity === 'error' ? '❌' : '⚠️';
    console.log(`${statusIcon} ${result.name}: ${result.message}`);
  }

  if (summary.errors.length > 0) {
    console.error(`\n❌  Security header validation failed (${summary.errors.length} error${summary.errors.length === 1 ? '' : 's'}).`);
    process.exit(1);
  }

  if (summary.warnings.length > 0) {
    console.warn(`\n⚠️  Security header validation completed with ${summary.warnings.length} warning${summary.warnings.length === 1 ? '' : 's'}.`);
  } else {
    console.log('\n✅  Security header validation passed.');
  }
}

main().catch((error) => {
  console.error(`\n❌  Unexpected error: ${error.message}`);
  process.exit(1);
});
