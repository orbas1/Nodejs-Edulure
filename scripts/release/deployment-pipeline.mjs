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

function buildPipelinePlan(manifest, environmentKey) {
  const environment = manifest.environments?.[environmentKey];
  if (!environment) {
    const available = Object.keys(manifest.environments ?? {}).join(', ');
    throw new Error(`Unknown environment '${environmentKey}'. Available: ${available}`);
  }

  const moduleEntries = Object.entries(manifest.modules ?? {})
    .map(([name, value]) => ({ name, path: value.path }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const terraformPath = environment.path;
  const blueprintEndpoint = `https://${environmentKey}.edulure.com/ops/runtime-blueprint.json`;

  return {
    generatedAt: new Date().toISOString(),
    environment: environmentKey,
    terraformWorkspacePath: terraformPath,
    modules: moduleEntries,
    artifacts: {
      licenseSummary: 'reports/licenses/summary.json',
      licensePipelineManifest: 'reports/licenses/pipeline-manifest.json',
      observabilityDashboard: 'infrastructure/observability/grafana/dashboards/environment-runtime.json',
      blueprintEndpoint
    },
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
            command: `curl --fail ${blueprintEndpoint}`
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

  return lines.join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const __filename = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
  const manifest = await loadEnvironmentManifest(repoRoot);

  const environmentKey = options.environment ?? 'staging';
  const plan = buildPipelinePlan(manifest, environmentKey);

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
