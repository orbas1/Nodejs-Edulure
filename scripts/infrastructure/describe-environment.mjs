#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function parseArgs(rawArgs) {
  const options = {
    environment: null,
    format: 'markdown'
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const token = rawArgs[index];
    switch (token) {
      case '--env':
      case '-e': {
        const value = rawArgs[index + 1];
        if (!value) {
          throw new Error('Missing value for --env option.');
        }
        options.environment = value.toLowerCase();
        index += 1;
        break;
      }
      case '--format':
      case '-f': {
        const value = rawArgs[index + 1];
        if (!value) {
          throw new Error('Missing value for --format option.');
        }
        const normalised = value.toLowerCase();
        if (!['markdown', 'json'].includes(normalised)) {
          throw new Error("Unsupported format. Choose 'markdown' or 'json'.");
        }
        options.format = normalised;
        index += 1;
        break;
      }
      default:
        throw new Error(`Unknown argument '${token}'. Supported options: --env, --format.`);
    }
  }

  return options;
}

async function loadEnvironmentManifest(repoRoot) {
  const manifestPath = path.join(repoRoot, 'infrastructure', 'environment-manifest.json');
  const contents = await readFile(manifestPath, 'utf8');
  return JSON.parse(contents);
}

async function loadDescriptor(repoRoot, manifest, environmentKey) {
  const envEntry = manifest.environments?.[environmentKey];
  const descriptorEntry = envEntry?.descriptor;
  const descriptorPath = descriptorEntry?.path
    ? path.join(repoRoot, descriptorEntry.path)
    : path.join(repoRoot, 'infrastructure', 'environments', `${environmentKey}.json`);

  try {
    const contents = await readFile(descriptorPath, 'utf8');
    const descriptor = JSON.parse(contents);
    return {
      ...descriptor,
      __file: descriptorEntry?.path ?? path.relative(repoRoot, descriptorPath),
      __hash: descriptorEntry?.hash ?? null
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function resolveBlueprint(manifest, environmentKey) {
  const blueprintEntry = manifest.blueprints?.backendService;
  if (!blueprintEntry) {
    return null;
  }

  const registryRecord = blueprintEntry.registry?.[environmentKey];
  const parameter = registryRecord?.ssmParameter
    ?? blueprintEntry.ssmParameter?.replace?.('${environment}', environmentKey)
    ?? null;
  const runtimeEndpoint = registryRecord?.runtimeEndpoint
    ?? (environmentKey === 'prod'
      ? 'https://edulure.com/ops/runtime-blueprint.json'
      : `https://${environmentKey}.edulure.com/ops/runtime-blueprint.json`);

  return {
    parameter,
    runtimeEndpoint,
    version: registryRecord?.version ?? blueprintEntry.version ?? null,
    moduleHash: registryRecord?.moduleHash ?? blueprintEntry.moduleHash ?? null,
    blueprintHash: registryRecord?.blueprintHash ?? blueprintEntry.hash ?? null,
    dashboardPath: registryRecord?.observabilityDashboardPath
      ?? blueprintEntry.observability?.grafana?.path
      ?? null
  };
}

function buildSummary(manifest, descriptor, environmentKey) {
  const environment = manifest.environments?.[environmentKey];
  if (!environment) {
    const available = Object.keys(manifest.environments ?? {}).join(', ');
    throw new Error(`Unknown environment '${environmentKey}'. Available: ${available}`);
  }

  const modules = Object.entries(manifest.modules ?? {})
    .map(([name, value]) => ({ name, path: value.path, hash: value.hash ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const blueprint = resolveBlueprint(manifest, environmentKey);

  return {
    environment: environmentKey,
    descriptor: descriptor
      ? {
          file: descriptor.__file,
          hash: descriptor.__hash,
          domain: descriptor.domain ?? null,
          aws: descriptor.aws ?? null,
          contacts: descriptor.contacts ?? null,
          changeWindows: descriptor.changeWindows ?? [],
          dockerCompose: descriptor.dockerCompose ?? null,
          observability: descriptor.observability ?? null,
          notes: Array.isArray(descriptor.notes) ? descriptor.notes : []
        }
      : null,
    terraformWorkspace: environment.path,
    modules,
    blueprint,
    pipelines: manifest.pipelines ?? null
  };
}

function renderMarkdown(summary) {
  const lines = [];
  lines.push(`# Environment Overview — ${summary.environment}`);
  lines.push('');
  lines.push(`Terraform workspace: \`${summary.terraformWorkspace}\``);
  lines.push('');

  if (summary.descriptor) {
    const descriptor = summary.descriptor;
    lines.push('## Descriptor');
    lines.push('');
    lines.push(`- File: ${descriptor.file}`);
    if (descriptor.hash) {
      lines.push(`- Hash: ${descriptor.hash}`);
    }
    if (descriptor.domain) {
      lines.push(`- Domain: ${descriptor.domain}`);
    }
    if (descriptor.aws) {
      const { accountAlias, region, vpcId } = descriptor.aws;
      if (accountAlias) {
        lines.push(`- AWS account alias: ${accountAlias}`);
      }
      if (region) {
        lines.push(`- AWS region: ${region}`);
      }
      if (vpcId) {
        lines.push(`- VPC: ${vpcId}`);
      }
    }
    if (descriptor.dockerCompose?.command) {
      lines.push(`- Docker Compose command: \`${descriptor.dockerCompose.command}\``);
    }
    if (Array.isArray(descriptor.changeWindows) && descriptor.changeWindows.length > 0) {
      lines.push('- Change windows:');
      for (const window of descriptor.changeWindows) {
        lines.push(`  - ${window}`);
      }
    }
    if (descriptor.contacts && (descriptor.contacts.primary || descriptor.contacts.onCall)) {
      lines.push('- Contacts:');
      if (descriptor.contacts.primary) {
        lines.push(`  - Primary: ${descriptor.contacts.primary}`);
      }
      if (descriptor.contacts.onCall) {
        lines.push(`  - On-call: ${descriptor.contacts.onCall}`);
      }
    }
    if (Array.isArray(descriptor.notes) && descriptor.notes.length > 0) {
      lines.push('- Notes:');
      for (const note of descriptor.notes) {
        lines.push(`  - ${note}`);
      }
    }
    lines.push('');
  }

  if (summary.blueprint) {
    const blueprint = summary.blueprint;
    lines.push('## Blueprint');
    lines.push('');
    if (blueprint.parameter) {
      lines.push(`- SSM parameter: ${blueprint.parameter}`);
    }
    if (blueprint.runtimeEndpoint) {
      lines.push(`- Runtime endpoint: ${blueprint.runtimeEndpoint}`);
    }
    if (blueprint.version) {
      lines.push(`- Version: ${blueprint.version}`);
    }
    if (blueprint.moduleHash) {
      lines.push(`- Module hash: ${blueprint.moduleHash}`);
    }
    if (blueprint.blueprintHash) {
      lines.push(`- Blueprint hash: ${blueprint.blueprintHash}`);
    }
    if (blueprint.dashboardPath) {
      lines.push(`- Observability dashboard: ${blueprint.dashboardPath}`);
    }
    lines.push('');
  }

  if (summary.modules.length > 0) {
    lines.push('## Terraform Modules');
    lines.push('');
    lines.push('| Module | Path | Hash |');
    lines.push('| --- | --- | --- |');
    for (const module of summary.modules) {
      const hash = module.hash ?? '—';
      lines.push(`| ${module.name} | ${module.path} | ${hash} |`);
    }
    lines.push('');
  }

  if (summary.pipelines?.deployment?.script) {
    lines.push('## Pipeline Integration');
    lines.push('');
    lines.push(`- Deployment pipeline script: ${summary.pipelines.deployment.script}`);
    if (summary.pipelines.deployment.blueprintRegistry) {
      lines.push(`- Blueprint registry table: ${summary.pipelines.deployment.blueprintRegistry}`);
    }
    if (summary.descriptor?.observability?.cloudwatchDashboard) {
      lines.push(`- CloudWatch dashboard: ${summary.descriptor.observability.cloudwatchDashboard}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const __filename = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
  const manifest = await loadEnvironmentManifest(repoRoot);

  const environmentKey = options.environment ?? 'staging';
  const descriptor = await loadDescriptor(repoRoot, manifest, environmentKey);
  const summary = buildSummary(manifest, descriptor, environmentKey);

  if (options.format === 'json') {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${renderMarkdown(summary)}\n`);
}

main().catch((error) => {
  console.error('Failed to describe environment:', error);
  process.exit(1);
});
