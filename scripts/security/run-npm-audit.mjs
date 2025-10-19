#!/usr/bin/env node
import { execFile } from 'node:child_process';
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

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = { workspace: null };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--workspace' || arg === '-w') {
      parsed.workspace = args[i + 1] ?? null;
      i += 1;
    }
  }
  return parsed;
}

function runAudit({ cwd }) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    throw new Error('npm_execpath is not defined. Run this script via an npm script context.');
  }
  const command = process.env.npm_node_execpath || process.execPath;
  const args = [npmCli, 'audit', '--json', '--audit-level=moderate'];

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

  if (match.expiresOn && new Date(match.expiresOn) < new Date()) {
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

async function main() {
  const { workspace } = parseArgs();
  const cwdUrl = workspace ? new URL(`../../${workspace}/`, import.meta.url) : new URL('../../', import.meta.url);
  const resolvedCwd = fileURLToPath(cwdUrl);

  const { report } = await runAudit({ cwd: resolvedCwd });
  const findings = extractFindings({ report });

  if (!findings.length) {
    console.log('npm audit: no actionable vulnerabilities detected');
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
      unapproved.push({ ...finding, allowlistExpired: true });
      continue;
    }

    accepted.push({ ...finding, allowlistEntry });
  }

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
      const note = finding.allowlistExpired ? ' (allowlist expired)' : '';
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
