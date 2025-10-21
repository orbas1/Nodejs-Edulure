#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';
import { createRequire } from 'module';

const args = process.argv.slice(2);

function parseArgs(rawArgs) {
  const parsed = {
    workspace: null,
    format: 'json',
    includeDev: true,
    outputDir: null,
    policyPath: null
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const token = rawArgs[index];
    switch (token) {
      case '--workspace':
      case '-w': {
        const value = rawArgs[index + 1];
        if (!value) throw new Error('Missing value for --workspace option.');
        parsed.workspace = value;
        index += 1;
        break;
      }
      case '--format': {
        const value = rawArgs[index + 1];
        if (!value) throw new Error('Missing value for --format option.');
        parsed.format = value.toLowerCase();
        index += 1;
        break;
      }
      case '--production-only':
      case '--prod-only':
      case '--no-dev':
        parsed.includeDev = false;
        break;
      case '--output-dir':
      case '-o': {
        const value = rawArgs[index + 1];
        if (!value) throw new Error('Missing value for --output-dir option.');
        parsed.outputDir = value;
        index += 1;
        break;
      }
      case '--policy': {
        const value = rawArgs[index + 1];
        if (!value) throw new Error('Missing value for --policy option.');
        parsed.policyPath = value;
        index += 1;
        break;
      }
      default:
        throw new Error(`Unsupported argument '${token}'.`);
    }
  }

  if (!['json', 'ndjson'].includes(parsed.format)) {
    throw new Error(`Unsupported output format '${parsed.format}'. Expected json or ndjson.`);
  }

  return parsed;
}

const cliOptions = (() => {
  try {
    return parseArgs(args);
  } catch (error) {
    console.error(`\n❌  ${error.message}`);
    process.exit(1);
  }
})();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const reportsDir = path.resolve(repoRoot, cliOptions.outputDir ?? path.join('reports', 'licenses'));

const workspaces = [
  { name: 'root', location: repoRoot },
  { name: 'backend-nodejs', location: path.join(repoRoot, 'backend-nodejs') },
  { name: 'frontend-reactjs', location: path.join(repoRoot, 'frontend-reactjs') },
  { name: 'sdk-typescript', location: path.join(repoRoot, 'sdk-typescript') }
];

const defaultPolicy = {
  bannedLicenseMatchers: [/AGPL/i, /LGPL/i, /GPL/i],
  requireLicenseField: true
};

async function loadPolicy(policyPath) {
  if (!policyPath) {
    return defaultPolicy;
  }

  const resolved = path.isAbsolute(policyPath) ? policyPath : path.join(repoRoot, policyPath);
  try {
    const contents = await fs.readFile(resolved, 'utf8');
    const parsed = JSON.parse(contents);
    return {
      bannedLicenseMatchers: (parsed.bannedLicenses ?? []).map((pattern) => new RegExp(pattern, 'i')),
      requireLicenseField: parsed.requireLicenseField !== false
    };
  } catch (error) {
    throw new Error(`Unable to load policy file at ${resolved}: ${error.message}`);
  }
}

const require = createRequire(import.meta.url);
let checker;
try {
  checker = require('license-checker');
} catch (error) {
  console.error('The license-checker dependency is required. Run `npm install` from the repo root.');
  throw error;
}

async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

function normaliseLicense(licenseValue) {
  if (!licenseValue) {
    return [];
  }

  const values = Array.isArray(licenseValue) ? licenseValue : String(licenseValue).split(/\s*(?:\||OR|\/|,|\n)\s*/);
  return values
    .map((license) => license.trim())
    .filter(Boolean)
    .map((license) => license.replace(/\s+/g, ' '));
}

function hasBannedLicense(policy, licenseList) {
  return licenseList.some((license) => policy.bannedLicenseMatchers.some((matcher) => matcher.test(license)));
}

async function createLicenseReport(startPath) {
  return new Promise((resolve, reject) => {
    checker.init(
      {
        start: startPath,
        production: true,
        development: cliOptions.includeDev,
        excludePrivatePackages: false
      },
      (error, json) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(json);
      }
    );
  });
}

async function writeReport(workspaceName, data) {
  const extension = cliOptions.format === 'ndjson' ? 'ndjson' : 'json';
  const outputPath = path.join(reportsDir, `${workspaceName}-licenses.${extension}`);
  await fs.writeFile(outputPath, serialiseReportPayload(data));
  return outputPath;
}

function selectWorkspaces() {
  if (!cliOptions.workspace) {
    return workspaces;
  }

  const match = workspaces.find((entry) => entry.name === cliOptions.workspace);
  if (!match) {
    throw new Error(`Unknown workspace '${cliOptions.workspace}'. Valid options: ${workspaces.map((ws) => ws.name).join(', ')}`);
  }

  return [match];
}

function serialiseReportPayload(payload) {
  if (cliOptions.format === 'json') {
    return JSON.stringify(payload, null, 2);
  }

  if (cliOptions.format === 'ndjson') {
    return (
      payload.packages
        .map((pkg) => JSON.stringify({ workspace: payload.workspace, generatedAt: payload.generatedAt, ...pkg }))
        .join('\n') + '\n'
    );
  }

  throw new Error(`Unsupported output format '${cliOptions.format}'. Expected json or ndjson.`);
}

function sortPackages(packages) {
  return [...packages].sort((a, b) => a.package.localeCompare(b.package));
}

async function main() {
  const policy = await loadPolicy(cliOptions.policyPath);
  await ensureDirectory(reportsDir);

  const summary = {
    generatedAt: new Date().toISOString(),
    includeDevDependencies: cliOptions.includeDev,
    reports: []
  };
  const bannedFindings = [];
  const policyBreaches = [];

  const selectedWorkspaces = selectWorkspaces();

  for (const workspace of selectedWorkspaces) {
    const relativePath = path.relative(repoRoot, workspace.location) || '.';
    console.log(`\n🔍 Auditing licenses for ${workspace.name} (${relativePath})`);

    let report;
    try {
      report = await createLicenseReport(workspace.location);
    } catch (error) {
      throw new Error(`Failed to generate license inventory for ${workspace.name}: ${error.message}`);
    }
    const packages = sortPackages(
      Object.entries(report).map(([pkg, metadata]) => ({
        package: pkg,
        version: metadata.version || 'unknown',
        licenses: normaliseLicense(metadata.licenses),
        repository: metadata.repository || null,
        publisher: metadata.publisher || null,
        email: metadata.email || null,
        licenseFile: metadata.licenseFile || null
      }))
    );

    for (const pkg of packages) {
      if (policy.requireLicenseField && pkg.licenses.length === 0) {
        policyBreaches.push({
          workspace: workspace.name,
          package: pkg.package,
          issue: 'missing_license'
        });
      }
      if (hasBannedLicense(policy, pkg.licenses)) {
        bannedFindings.push({ workspace: workspace.name, ...pkg });
      }
    }

    const outputPath = await writeReport(workspace.name, {
      generatedAt: new Date().toISOString(),
      workspace: workspace.name,
      packages
    });
    summary.reports.push({
      workspace: workspace.name,
      packageCount: packages.length,
      reportPath: path.relative(repoRoot, outputPath)
    });
  }

  summary.bannedFindings = bannedFindings;
  summary.policyBreaches = policyBreaches;
  await fs.writeFile(
    path.join(reportsDir, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );

  if (policyBreaches.length > 0 || bannedFindings.length > 0) {
    console.error('\n⚠️  License policy violations detected. Review reports in reports/licenses for details.');
    for (const breach of policyBreaches) {
      console.error(` - ${breach.package} in workspace ${breach.workspace} has no declared license.`);
    }
    for (const finding of bannedFindings) {
      console.error(` - ${finding.package} (${finding.licenses.join(', ') || 'unknown license'}) in workspace ${finding.workspace}`);
    }
    process.exitCode = 1;
  } else {
    console.log('\n✅ License reports generated without policy violations.');
  }

  if (summary.reports.length) {
    console.table(
      summary.reports.map((reportEntry) => ({
        workspace: reportEntry.workspace,
        packages: reportEntry.packageCount,
        report: reportEntry.reportPath
      }))
    );
  }
}

main().catch((error) => {
  console.error('Failed to generate license reports:', error);
  process.exit(1);
});
