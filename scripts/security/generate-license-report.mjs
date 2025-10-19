#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const reportsDir = path.join(repoRoot, 'reports', 'licenses');

const workspaces = [
  { name: 'root', location: repoRoot },
  { name: 'backend-nodejs', location: path.join(repoRoot, 'backend-nodejs') },
  { name: 'frontend-reactjs', location: path.join(repoRoot, 'frontend-reactjs') },
  { name: 'sdk-typescript', location: path.join(repoRoot, 'sdk-typescript') }
];

const bannedLicenseMatchers = [
  /AGPL/i,
  /LGPL/i,
  /GPL/i
];

const require = createRequire(import.meta.url);
const checker = require('license-checker');

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
    .filter(Boolean);
}

function hasBannedLicense(licenseList) {
  return licenseList.some((license) => bannedLicenseMatchers.some((matcher) => matcher.test(license)));
}

function createLicenseReport(startPath) {
  return new Promise((resolve, reject) => {
    checker.init(
      {
        start: startPath,
        production: true,
        development: true,
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
  const outputPath = path.join(reportsDir, `${workspaceName}-licenses.json`);
  const payload = {
    generatedAt: new Date().toISOString(),
    workspace: workspaceName,
    packages: data
  };
  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
  return outputPath;
}

async function main() {
  await ensureDirectory(reportsDir);

  const summary = {
    generatedAt: new Date().toISOString(),
    reports: []
  };
  const bannedFindings = [];

  for (const workspace of workspaces) {
    const report = await createLicenseReport(workspace.location);
    const packages = Object.entries(report).map(([pkg, metadata]) => ({
      package: pkg,
      licenses: normaliseLicense(metadata.licenses),
      repository: metadata.repository || null,
      publisher: metadata.publisher || null,
      email: metadata.email || null
    }));

    for (const pkg of packages) {
      if (hasBannedLicense(pkg.licenses)) {
        bannedFindings.push({ workspace: workspace.name, ...pkg });
      }
    }

    const outputPath = await writeReport(workspace.name, packages);
    summary.reports.push({
      workspace: workspace.name,
      packageCount: packages.length,
      reportPath: path.relative(repoRoot, outputPath)
    });
  }

  summary.bannedFindings = bannedFindings;
  await fs.writeFile(path.join(reportsDir, 'summary.json'), JSON.stringify(summary, null, 2));

  if (bannedFindings.length > 0) {
    console.error('\n⚠️  Disallowed licenses detected. Review reports in reports/licenses for details.');
    for (const finding of bannedFindings) {
      console.error(` - ${finding.package} (${finding.licenses.join(', ')}) in workspace ${finding.workspace}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('\n✅ License reports generated without banned licenses.');
  console.table(
    summary.reports.map((report) => ({
      workspace: report.workspace,
      packages: report.packageCount,
      report: report.reportPath
    }))
  );
}

main().catch((error) => {
  console.error('Failed to generate license reports:', error);
  process.exit(1);
});
