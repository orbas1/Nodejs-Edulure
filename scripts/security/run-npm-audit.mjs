#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'process';

const ALLOWLIST = [
  {
    id: '1088594',
    package: 'd3-color',
    workspace: 'frontend-reactjs',
    expiresOn: '2026-03-31',
    mitigation:
      'Recharts/victory vendor pins d3-color <3.1.0. Frontend sanitises palette inputs and does not parse untrusted colour strings; migration to patched charting library is tracked in governance backlog.'
  }
];

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const REPORTS_DIR = path.resolve(repoRoot, 'reports', 'security');

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    workspace: null,
    severity: 'moderate'
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if ((token === '--workspace' || token === '-w') && args[index + 1]) {
      parsed.workspace = args[index + 1];
      index += 1;
    } else if ((token === '--severity' || token === '-s') && args[index + 1]) {
      parsed.severity = args[index + 1].toLowerCase();
      index += 1;
    }
  }

  return parsed;
}

function validateSeverity(severity) {
  const allowed = ['low', 'moderate', 'high', 'critical'];
  if (!allowed.includes(severity)) {
    throw new Error(`Unsupported severity threshold '${severity}'. Choose one of: ${allowed.join(', ')}`);
  }
  return severity;
}

const cliOptions = (() => {
  const parsed = parseArgs();
  parsed.severity = validateSeverity(parsed.severity);
  return parsed;
})();

function runAudit({ cwd }) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    throw new Error('npm_execpath is not defined. Run this script via an npm script context.');
  }
  const command = process.env.npm_node_execpath || process.execPath;
  const args = [npmCli, 'audit', '--json', `--audit-level=${cliOptions.severity}`];

  return new Promise((resolve, reject) => {
    execFile(command, args, { cwd, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error && !stdout) {
        reject(new Error(stderr || error.message));
        return;
      }
      try {
        const report = JSON.parse(stdout);
        resolve({ report, stderr });
      } catch (parseError) {
        reject(new Error(`Failed to parse npm audit output: ${parseError.message}`));
      }
    });
  });
}

function isAllowlisted({ advisoryId, workspace }) {
  const match = ALLOWLIST.find((entry) => {
    if (entry.id !== advisoryId) {
      return false;
    }
    if (entry.workspace && entry.workspace !== workspace) {
      return false;
    }
    return true;
  });

  if (!match) {
    return null;
  }

  if (!match.expiresOn) {
    return { ...match, expired: true, reason: 'missing_expiry' };
  }

  if (new Date(match.expiresOn) < new Date()) {
    return { ...match, expired: true };
  }

  return { ...match, expired: false };
}

function extractFindings({ report }) {
  const vulnerabilities = report?.vulnerabilities ?? {};
  const findings = [];

  for (const vuln of Object.values(vulnerabilities)) {
    const severity = vuln?.severity ?? 'info';
    if (!['moderate', 'high', 'critical'].includes(severity)) {
      continue;
    }

    const viaEntries = Array.isArray(vuln.via)
      ? vuln.via.filter((entry) => typeof entry === 'object' && entry?.source)
      : [];

    for (const via of viaEntries) {
      findings.push({
        advisoryId: String(via.source ?? ''),
        name: via.name ?? vuln.name ?? 'unknown',
        severity,
        url: via.url ?? null,
        title: via.title ?? vuln.title ?? 'Untitled advisory',
        dependency: vuln.name ?? via.name ?? 'unknown'
      });
    }
  }

  return findings;
}

async function ensureReportsDir() {
  await fs.mkdir(REPORTS_DIR, { recursive: true });
}

async function persistReport({ workspace, severity, findings, accepted, unapproved, report }) {
  await ensureReportsDir();
  const reportName = `${workspace || 'root'}-npm-audit.json`;
  const payload = {
    generatedAt: new Date().toISOString(),
    workspace: workspace ?? 'root',
    severityThreshold: severity,
    summary: {
      findings: findings.length,
      allowlisted: accepted.length,
      unapproved: unapproved.length
    },
    report,
    findings,
    accepted,
    unapproved
  };
  const outputPath = path.join(REPORTS_DIR, reportName);
  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
  return outputPath;
}

async function main() {
  const { workspace, severity } = cliOptions;
  const cwdUrl = workspace ? new URL(`../../${workspace}/`, import.meta.url) : new URL('../../', import.meta.url);
  const resolvedCwd = fileURLToPath(cwdUrl);

  const { report } = await runAudit({ cwd: resolvedCwd });
  const findings = extractFindings({ report });

  if (!findings.length) {
    console.log('npm audit: no actionable vulnerabilities detected');
    const reportPath = await persistReport({ workspace, severity, findings: [], accepted: [], unapproved: [], report });
    console.log(`Audit report saved to ${path.relative(process.cwd(), reportPath)}`);
    return;
  }

  const unapproved = [];
  const accepted = [];

  for (const finding of findings) {
    const allowlistEntry = isAllowlisted({ advisoryId: finding.advisoryId, workspace });
    if (!allowlistEntry) {
      unapproved.push(finding);
      continue;
    }

    if (allowlistEntry.expired) {
      unapproved.push({ ...finding, allowlistExpired: true, allowlistEntry });
      continue;
    }

    accepted.push({ ...finding, allowlistEntry });
  }

  const reportPath = await persistReport({ workspace, severity, findings, accepted, unapproved, report });
  console.log(`Audit report saved to ${path.relative(process.cwd(), reportPath)}`);

  if (accepted.length) {
    console.log('⚠️  Allowlisted vulnerabilities detected:');
    for (const finding of accepted) {
      console.log(
        ` - [${finding.advisoryId}] ${finding.title} (${finding.severity}) in ${finding.dependency}. Mitigation: ${finding.allowlistEntry.mitigation}`
      );
    }
  }

  if (unapproved.length) {
    console.error('\n❌ Unapproved vulnerabilities detected:');
    for (const finding of unapproved) {
      let note = '';
      if (finding.allowlistExpired) {
        note = finding.allowlistEntry?.reason === 'missing_expiry' ? ' (allowlist missing expiry)' : ' (allowlist expired)';
      }
      console.error(` - [${finding.advisoryId}] ${finding.title}${note}`);
      if (finding.url) {
        console.error(`   ${finding.url}`);
      }
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Failed to run npm audit:', error);
  process.exit(1);
});
