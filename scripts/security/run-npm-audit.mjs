#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'process';

const DEFAULT_ALLOWLIST = [
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

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    workspace: null,
    severity: 'moderate',
    outputDir: path.join('reports', 'security'),
    allowlistPath: process.env.NPM_AUDIT_ALLOWLIST ?? null
  };

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    switch (token) {
      case '--workspace':
      case '-w': {
        const value = args[index + 1];
        if (!value) {
          throw new Error('Missing value for --workspace option.');
        }
        parsed.workspace = value;
        index += 1;
        break;
      }
      case '--severity':
      case '-s': {
        const value = args[index + 1];
        if (!value) {
          throw new Error('Missing value for --severity option.');
        }
        parsed.severity = value.toLowerCase();
        index += 1;
        break;
      }
      case '--output-dir':
      case '-o': {
        const value = args[index + 1];
        if (!value) {
          throw new Error('Missing value for --output-dir option.');
        }
        parsed.outputDir = value;
        index += 1;
        break;
      }
      case '--allowlist': {
        const value = args[index + 1];
        if (!value) {
          throw new Error('Missing value for --allowlist option.');
        }
        parsed.allowlistPath = value;
        index += 1;
        break;
      }
      default:
        throw new Error(`Unsupported argument '${token}'.`);
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

async function readJsonIfExists(filePath) {
  try {
    const contents = await fs.readFile(filePath, 'utf8');
    return JSON.parse(contents);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function loadAllowlist(allowlistPath) {
  if (!allowlistPath) {
    return DEFAULT_ALLOWLIST;
  }
  const resolved = path.isAbsolute(allowlistPath) ? allowlistPath : path.join(repoRoot, allowlistPath);
  const payload = await readJsonIfExists(resolved);
  if (!payload) {
    throw new Error(`Allowlist file not found at ${resolved}`);
  }
  if (!Array.isArray(payload)) {
    throw new Error(`Allowlist file at ${resolved} must export an array of entries.`);
  }
  return payload;
}

async function discoverWorkspaces() {
  const rootPackage = await readJsonIfExists(path.join(repoRoot, 'package.json'));
  const workspaces = [{ name: 'root', location: repoRoot }];
  const patterns = Array.isArray(rootPackage?.workspaces) ? rootPackage.workspaces : [];

  for (const pattern of patterns) {
    if (pattern.includes('*')) {
      console.warn(`[npm-audit] Workspace pattern '${pattern}' contains a wildcard. Expand it manually in package.json to enable automated audits.`);
      continue;
    }
    const workspacePath = path.join(repoRoot, pattern);
    workspaces.push({ name: pattern, location: workspacePath });
  }
  return workspaces;
}

function selectTargets(allWorkspaces, requestedWorkspace) {
  if (!requestedWorkspace || requestedWorkspace === 'all') {
    return allWorkspaces;
  }
  const match = allWorkspaces.find((entry) => entry.name === requestedWorkspace);
  if (!match) {
    throw new Error(`Unknown workspace '${requestedWorkspace}'. Valid options: ${allWorkspaces.map((entry) => entry.name).join(', ')}`);
  }
  return [match];
}

function runAudit({ cwd, severity }) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    throw new Error('npm_execpath is not defined. Run this script via an npm script context.');
  }
  const command = process.env.npm_node_execpath || process.execPath;
  const args = [npmCli, 'audit', '--json', `--audit-level=${severity}`];

  return new Promise((resolve, reject) => {
    execFile(command, args, { cwd, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error && !stdout) {
        reject(new Error(stderr || error.message));
        return;
      }
      try {
        const report = JSON.parse(stdout);
        resolve({ report, stderr: stderr || null });
      } catch (parseError) {
        reject(new Error(`Failed to parse npm audit output: ${parseError.message}`));
      }
    });
  });
}

function isAllowlisted({ advisoryId, workspace }, allowlist) {
  const match = allowlist.find((entry) => {
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

async function ensureReportsDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function persistReport({ workspace, severity, findings, accepted, unapproved, report, reportDir, allowlistSource }) {
  await ensureReportsDir(reportDir);
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
    allowlistSource,
    report,
    findings,
    accepted,
    unapproved
  };
  const outputPath = path.join(reportDir, reportName);
  await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
  return outputPath;
}

async function runAuditForWorkspace({ workspace, location, severity, allowlist, reportDir, allowlistSource }) {
  const { report } = await runAudit({ cwd: location, severity });
  const findings = extractFindings({ report });

  if (!findings.length) {
    const reportPath = await persistReport({
      workspace,
      severity,
      findings: [],
      accepted: [],
      unapproved: [],
      report,
      reportDir,
      allowlistSource
    });
    return {
      workspace,
      reportPath,
      findings: 0,
      accepted: 0,
      unapproved: 0,
      exitCode: 0
    };
  }

  const unapproved = [];
  const accepted = [];

  for (const finding of findings) {
    const allowlistEntry = isAllowlisted({ advisoryId: finding.advisoryId, workspace }, allowlist);
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

  const reportPath = await persistReport({
    workspace,
    severity,
    findings,
    accepted,
    unapproved,
    report,
    reportDir,
    allowlistSource
  });

  return {
    workspace,
    reportPath,
    findings: findings.length,
    accepted: accepted.length,
    unapproved: unapproved.length,
    exitCode: unapproved.length ? 1 : 0,
    acceptedFindings: accepted,
    unapprovedFindings: unapproved
  };
}

async function main() {
  let cliOptions;
  try {
    cliOptions = parseArgs();
    cliOptions.severity = validateSeverity(cliOptions.severity);
  } catch (error) {
    console.error(`\n❌  ${error.message}`);
    process.exit(1);
    return;
  }

  const reportDir = path.isAbsolute(cliOptions.outputDir)
    ? cliOptions.outputDir
    : path.join(repoRoot, cliOptions.outputDir);

  const allowlist = await loadAllowlist(cliOptions.allowlistPath);
  const allowlistSource = cliOptions.allowlistPath ? path.resolve(cliOptions.allowlistPath) : 'embedded';

  const allWorkspaces = await discoverWorkspaces();
  const targets = selectTargets(allWorkspaces, cliOptions.workspace);
  if (targets.length === 0) {
    console.error('No workspaces found to audit.');
    process.exit(1);
    return;
  }

  const summary = [];
  let hasFailures = false;

  for (const target of targets) {
    console.log(`\n🔐 Auditing npm dependencies for workspace ${target.name}`);
    const result = await runAuditForWorkspace({
      workspace: target.name === 'root' ? null : target.name,
      location: target.location,
      severity: cliOptions.severity,
      allowlist,
      reportDir,
      allowlistSource
    });

    summary.push(result);
    console.log(`Audit report saved to ${path.relative(process.cwd(), result.reportPath)}`);

    if (result.acceptedFindings?.length) {
      console.log('⚠️  Allowlisted vulnerabilities detected:');
      for (const finding of result.acceptedFindings) {
        console.log(
          ` - [${finding.advisoryId}] ${finding.title} (${finding.severity}) in ${finding.dependency}. Mitigation: ${finding.allowlistEntry.mitigation}`
        );
      }
    }

    if (result.unapprovedFindings?.length) {
      hasFailures = true;
      console.error('\n❌ Unapproved vulnerabilities detected:');
      for (const finding of result.unapprovedFindings) {
        let note = '';
        if (finding.allowlistExpired) {
          note = finding.allowlistEntry?.reason === 'missing_expiry' ? ' (allowlist missing expiry)' : ' (allowlist expired)';
        }
        console.error(` - [${finding.advisoryId}] ${finding.title}${note}`);
        if (finding.url) {
          console.error(`   ${finding.url}`);
        }
      }
    }
  }

  if (summary.length) {
    console.table(
      summary.map((entry) => ({
        workspace: entry.workspace || 'root',
        findings: entry.findings,
        allowlisted: entry.accepted,
        unapproved: entry.unapproved,
        report: path.relative(process.cwd(), entry.reportPath)
      }))
    );
  }

  if (hasFailures) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Failed to run npm audit:', error);
  process.exit(1);
});
