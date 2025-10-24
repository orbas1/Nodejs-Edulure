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
        options.environment = value;
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

async function loadEnvironmentDescriptor(repoRoot, manifest, environmentKey) {
  const envEntry = manifest.environments?.[environmentKey];
  const descriptorEntry = envEntry?.descriptor;
  if (!descriptorEntry?.path) {
    return null;
  }

  const absolutePath = path.join(repoRoot, descriptorEntry.path);

  try {
    const contents = await readFile(absolutePath, 'utf8');
    const data = JSON.parse(contents);
    return {
      ...data,
      __file: descriptorEntry.path,
      __hash: descriptorEntry.hash ?? null
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function resolveBlueprintDescriptor(manifest, environmentKey) {
  const blueprintEntry = manifest.blueprints?.backendService;
  if (!blueprintEntry) {
    return null;
  }

  const registryRecord = blueprintEntry.registry?.[environmentKey] ?? null;
  const fallbackParameter = typeof blueprintEntry.ssmParameter === 'string'
    ? blueprintEntry.ssmParameter.replace('${environment}', environmentKey)
    : null;
  const runtimeEndpoint = registryRecord?.runtimeEndpoint
    ?? (environmentKey === 'prod'
      ? 'https://edulure.com/ops/runtime-blueprint.json'
      : `https://${environmentKey}.edulure.com/ops/runtime-blueprint.json`);

  return {
    key: 'backendService',
    version: registryRecord?.version ?? blueprintEntry.version ?? null,
    serviceName: registryRecord?.serviceName ?? blueprintEntry.service ?? 'backend-service',
    modulePath: blueprintEntry.modulePath ?? blueprintEntry.module?.path ?? null,
    moduleHash: registryRecord?.moduleHash ?? blueprintEntry.moduleHash ?? blueprintEntry.module?.hash ?? null,
    blueprintPath: blueprintEntry.path ?? null,
    blueprintHash: registryRecord?.blueprintHash ?? blueprintEntry.hash ?? null,
    ssmParameter: registryRecord?.ssmParameter ?? fallbackParameter,
    runtimeEndpoint,
    observabilityDashboardPath:
      registryRecord?.observabilityDashboardPath
      ?? blueprintEntry.observability?.grafana?.path
      ?? blueprintEntry.dashboard
      ?? null,
    observabilityDashboardHash:
      registryRecord?.observabilityDashboardHash
      ?? blueprintEntry.observability?.grafana?.hash
      ?? null,
    alarmOutputs: registryRecord?.alarmOutputs ?? blueprintEntry.alarmOutputs ?? [],
    registryTable:
      manifest.pipelines?.deployment?.blueprintRegistry
      ?? blueprintEntry.metadata?.registryTable
      ?? null,
    metadata: {
      ...((blueprintEntry.metadata && typeof blueprintEntry.metadata === 'object' && !Array.isArray(blueprintEntry.metadata))
        ? blueprintEntry.metadata
        : {}),
      ...((registryRecord?.metadata
        && typeof registryRecord.metadata === 'object'
        && !Array.isArray(registryRecord.metadata))
        ? registryRecord.metadata
        : {})
    }
  };
}

function buildPipelinePlan(manifest, environmentKey, descriptor) {
  const environment = manifest.environments?.[environmentKey];
  if (!environment) {
    const available = Object.keys(manifest.environments ?? {}).join(', ');
    throw new Error(`Unknown environment '${environmentKey}'. Available: ${available}`);
  }

  const moduleEntries = Object.entries(manifest.modules ?? {})
    .map(([name, value]) => ({ name, path: value.path }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const terraformPath = environment.path;
  const blueprint = resolveBlueprintDescriptor(manifest, environmentKey);
  const blueprintEndpoint = blueprint?.runtimeEndpoint
    ?? (environmentKey === 'prod'
      ? 'https://edulure.com/ops/runtime-blueprint.json'
      : `https://${environmentKey}.edulure.com/ops/runtime-blueprint.json`);

  return {
    generatedAt: new Date().toISOString(),
    environment: environmentKey,
    terraformWorkspacePath: terraformPath,
    modules: moduleEntries,
    artifacts: {
      licenseSummary: 'reports/licenses/summary.json',
      licensePipelineManifest: 'reports/licenses/pipeline-manifest.json',
      observabilityDashboard: blueprint?.observabilityDashboardPath
        ?? 'infrastructure/observability/grafana/dashboards/environment-runtime.json',
      blueprintEndpoint,
      blueprintParameter: blueprint?.ssmParameter ?? null,
      blueprintVersion: blueprint?.version ?? null,
      environmentDescriptor: descriptor?.__file ?? null
    },
    blueprint,
    environmentDescriptor: descriptor
      ? {
          file: descriptor.__file,
          hash: descriptor.__hash,
          environment: descriptor.environment ?? environmentKey,
          domain: descriptor.domain ?? null,
          aws: descriptor.aws ?? null,
          blueprint: descriptor.blueprint ?? null,
          terraformWorkspace: descriptor.terraformWorkspace ?? environment.path,
          changeWindows: descriptor.changeWindows ?? [],
          contacts: descriptor.contacts ?? {},
          dockerCompose: descriptor.dockerCompose ?? null,
          observability: descriptor.observability ?? null,
          notes: Array.isArray(descriptor.notes) ? descriptor.notes : []
        }
      : null,
    phases: [
      {
        name: 'Build',
        description: 'Assemble artefacts for backend, frontend, and SDK workspaces.',
        steps: [
          {
            id: 'dependencies',
            title: 'Install dependencies',
            command: 'npm install --include-workspace-root'
          },
          {
            id: 'workspace-builds',
            title: 'Build workspaces',
            command: 'npm run build --workspaces'
          }
        ]
      },
      {
        name: 'Security & Compliance',
        description: 'Run Annex A47 controls covering license scans and policy review.',
        steps: [
          {
            id: 'license-audit',
            title: 'Generate license reports',
            command: 'node scripts/security/generate-license-report.mjs --ci --pipeline-manifest reports/licenses/pipeline-manifest.json'
          },
          {
            id: 'supply-chain-audit',
            title: 'Run npm audit enforcement',
            command: 'npm run audit:ci'
          }
        ]
      },
      {
        name: 'Infrastructure',
        description: 'Plan and apply Terraform for environment provisioning (Annex A46).',
        steps: [
          {
            id: 'terraform-init',
            title: 'Initialise Terraform workspace',
            command: `terraform -chdir=${terraformPath} init`
          },
          {
            id: 'terraform-plan',
            title: 'Review infrastructure changes',
            command: `terraform -chdir=${terraformPath} plan`
          },
          {
            id: 'terraform-apply',
            title: 'Apply infrastructure changes',
            command: `terraform -chdir=${terraformPath} apply`
          }
        ]
      },
      {
        name: 'Application Deployment',
        description: 'Deploy backend services and publish artefacts to the runtime.',
        steps: [
          {
            id: 'backend-deploy',
            title: 'Deploy backend service',
            command: `npm run deploy -- --env ${environmentKey}`
          },
          {
            id: 'frontend-deploy',
            title: 'Deploy frontend bundle',
            command: `npm run deploy:frontend -- --env ${environmentKey}`
          }
        ]
      },
      {
        name: 'Verification & Handover',
        description: 'Execute post-deploy validation and surface observability artefacts.',
        steps: [
          {
            id: 'readiness',
            title: 'Run release readiness suite',
            command: 'node scripts/release/run-readiness.mjs --format markdown'
          },
          {
            id: 'blueprint-fetch',
            title: 'Verify environment blueprint endpoint',
            command: `curl --fail --header 'Accept: application/json' ${blueprintEndpoint}`
          }
        ]
      }
    ]
  };
}

function renderMarkdown(plan) {
  const lines = [];
  lines.push(`# Deployment Pipeline — ${plan.environment}`);
  lines.push('');
  lines.push(`Generated at: ${plan.generatedAt}`);
  lines.push('');
  lines.push('## Artefacts');
  lines.push('');
  lines.push('| Name | Location |');
  lines.push('| --- | --- |');
  lines.push(`| License summary | ${plan.artifacts.licenseSummary} |`);
  lines.push(`| License pipeline manifest | ${plan.artifacts.licensePipelineManifest} |`);
  lines.push(`| Observability dashboard | ${plan.artifacts.observabilityDashboard} |`);
  lines.push(`| Blueprint endpoint | ${plan.artifacts.blueprintEndpoint} |`);
  if (plan.artifacts.blueprintParameter) {
    lines.push(`| Blueprint SSM parameter | ${plan.artifacts.blueprintParameter} |`);
  }
  if (plan.artifacts.blueprintVersion) {
    lines.push(`| Blueprint version | ${plan.artifacts.blueprintVersion} |`);
  }
  if (plan.artifacts.environmentDescriptor) {
    lines.push(`| Environment descriptor | ${plan.artifacts.environmentDescriptor} |`);
  }
  lines.push('');

  lines.push('## Terraform Modules');
  lines.push('');
  lines.push('| Module | Path |');
  lines.push('| --- | --- |');
  for (const module of plan.modules) {
    lines.push(`| ${module.name} | ${module.path} |`);
  }
  lines.push('');

  for (const phase of plan.phases) {
    lines.push(`## Phase: ${phase.name}`);
    lines.push('');
    lines.push(`${phase.description}`);
    lines.push('');
    lines.push('| Step | Command |');
    lines.push('| --- | --- |');
    for (const step of phase.steps) {
      const escapedCommand = step.command.replace(/`/g, '\\`');
      lines.push(`| ${step.title} | \`${escapedCommand}\` |`);
    }
    lines.push('');
  }

  if (plan.blueprint) {
    lines.push('## Blueprint');
    lines.push('');
    lines.push(`- Key: ${plan.blueprint.key}`);
    lines.push(`- Service: ${plan.blueprint.serviceName}`);
    lines.push(`- Version: ${plan.blueprint.version ?? 'n/a'}`);
    if (plan.blueprint.registryTable) {
      lines.push(`- Registry table: ${plan.blueprint.registryTable}`);
    }
    if (plan.blueprint.modulePath) {
      lines.push(`- Module path: ${plan.blueprint.modulePath}`);
    }
    if (plan.blueprint.moduleHash) {
      lines.push(`- Module hash: ${plan.blueprint.moduleHash}`);
    }
    if (plan.blueprint.blueprintPath) {
      lines.push(`- Blueprint path: ${plan.blueprint.blueprintPath}`);
    }
    if (plan.blueprint.blueprintHash) {
      lines.push(`- Blueprint hash: ${plan.blueprint.blueprintHash}`);
    }
    if (plan.blueprint.observabilityDashboardPath) {
      lines.push(`- Observability dashboard: ${plan.blueprint.observabilityDashboardPath}`);
    }
    if (plan.blueprint.observabilityDashboardHash) {
      lines.push(`- Dashboard hash: ${plan.blueprint.observabilityDashboardHash}`);
    }
    const alarms = Array.isArray(plan.blueprint.alarmOutputs) && plan.blueprint.alarmOutputs.length
      ? plan.blueprint.alarmOutputs.join(', ')
      : 'None';
    lines.push(`- Alarm outputs: ${alarms}`);
    if (plan.blueprint.metadata && Object.keys(plan.blueprint.metadata).length > 0) {
      lines.push('- Metadata:');
      for (const [key, value] of Object.entries(plan.blueprint.metadata)) {
        if (value === null || value === undefined || value === '') {
          continue;
        }
        lines.push(`  - ${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
      }
    }
    lines.push('');
  }

  if (plan.environmentDescriptor) {
    const descriptor = plan.environmentDescriptor;
    lines.push('## Environment Descriptor');
    lines.push('');
    lines.push(`- File: ${descriptor.file}`);
    if (descriptor.hash) {
      lines.push(`- Hash: ${descriptor.hash}`);
    }
    if (descriptor.domain) {
      lines.push(`- Domain: ${descriptor.domain}`);
    }
    if (descriptor.aws) {
      if (descriptor.aws.accountAlias) {
        lines.push(`- AWS account: ${descriptor.aws.accountAlias}`);
      }
      if (descriptor.aws.region) {
        lines.push(`- AWS region: ${descriptor.aws.region}`);
      }
      if (descriptor.aws.vpcId) {
        lines.push(`- VPC: ${descriptor.aws.vpcId}`);
      }
    }
    if (descriptor.blueprint) {
      if (descriptor.blueprint.parameter) {
        lines.push(`- Blueprint parameter: ${descriptor.blueprint.parameter}`);
      }
      if (descriptor.blueprint.runtimeEndpoint) {
        lines.push(`- Blueprint endpoint: ${descriptor.blueprint.runtimeEndpoint}`);
      }
    }
    if (descriptor.terraformWorkspace) {
      lines.push(`- Terraform workspace: ${descriptor.terraformWorkspace}`);
    }
    if (descriptor.dockerCompose?.command) {
      lines.push(`- Docker compose: ${descriptor.dockerCompose.command}`);
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

  return lines.join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const __filename = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
  const manifest = await loadEnvironmentManifest(repoRoot);

  const environmentKey = options.environment ?? 'staging';
  const descriptor = await loadEnvironmentDescriptor(repoRoot, manifest, environmentKey);
  const plan = buildPipelinePlan(manifest, environmentKey, descriptor);

  if (options.format === 'json') {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${renderMarkdown(plan)}\n`);
}

main().catch((error) => {
  console.error('Failed to build deployment pipeline plan:', error);
  process.exit(1);
});
