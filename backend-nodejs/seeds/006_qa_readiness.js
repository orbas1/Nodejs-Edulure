import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { parseLcovReport, parseVitestSummary } from '../../scripts/qa/lib/coverage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const SURFACES = [
  {
    slug: 'backend',
    displayName: 'Backend API',
    surfaceType: 'api',
    repositoryPath: 'backend-nodejs',
    ownerTeam: 'quality-engineering',
    ciIdentifier: 'backend:test',
    thresholds: { statements: 0.8, branches: 0.75, functions: 0.8, lines: 0.8 },
    metadata: {
      coverageReport: 'backend-nodejs/coverage/coverage-summary.json',
      docs: 'logic_flows.md#A50'
    }
  },
  {
    slug: 'frontend',
    displayName: 'Frontend Web',
    surfaceType: 'web',
    repositoryPath: 'frontend-reactjs',
    ownerTeam: 'quality-engineering',
    ciIdentifier: 'frontend:test',
    thresholds: { statements: 0.85, branches: 0.8, functions: 0.85, lines: 0.85 },
    metadata: {
      coverageReport: 'frontend-reactjs/coverage/coverage-summary.json',
      docs: 'logic_flows.md#A50'
    }
  },
  {
    slug: 'flutter',
    displayName: 'Flutter Mobile',
    surfaceType: 'mobile',
    repositoryPath: 'Edulure-Flutter',
    ownerTeam: 'quality-engineering',
    ciIdentifier: 'flutter:test',
    thresholds: { statements: 0.7, branches: 0.65, functions: 0.75, lines: 0.7 },
    metadata: {
      coverageReport: 'Edulure-Flutter/coverage/lcov.info',
      docs: 'logic_flows.md#A50'
    }
  }
];

const SUITES = [
  {
    suiteKey: 'backend',
    surfaceSlug: 'backend',
    suiteType: 'unit+integration',
    description: 'Vitest API and repository suite',
    ownerEmail: 'qa@edulure.com',
    ciJob: 'ci/backend#test',
    thresholds: { statements: 0.8, branches: 0.75, functions: 0.8, lines: 0.8 },
    metadata: { runner: 'vitest' }
  },
  {
    suiteKey: 'frontend',
    surfaceSlug: 'frontend',
    suiteType: 'component+accessibility',
    description: 'Vitest component regression suite',
    ownerEmail: 'qa@edulure.com',
    ciJob: 'ci/frontend#test',
    thresholds: { statements: 0.85, branches: 0.8, functions: 0.85, lines: 0.85 },
    metadata: { runner: 'vitest' }
  },
  {
    suiteKey: 'flutter',
    surfaceSlug: 'flutter',
    suiteType: 'widget',
    description: 'Flutter widget and integration suite',
    ownerEmail: 'mobile.qa@edulure.com',
    ciJob: 'ci/flutter#test',
    thresholds: { statements: 0.7, branches: 0.65, functions: 0.75, lines: 0.7 },
    metadata: { runner: 'flutter-test' }
  }
];

const FIXTURE_SETS = [
  {
    slug: 'navigation-annex-fixtures',
    title: 'Navigation Annex QA fixtures',
    description: 'Canonical annex backlog, documentation, and operations datasets for automated and manual QA.',
    dataScope: 'navigation',
    dataClassification: 'internal',
    anonymisationStrategy: 'synthetic-identities',
    seedCommand: 'npm --workspace backend-nodejs run seed',
    refreshCadence: 'weekly',
    storagePath: 'qa/reports/navigation-annex-scenario.json',
    checksum: null,
    ownerTeam: 'quality-engineering',
    lastRefreshedAt: new Date('2025-01-14T06:00:00Z'),
    metadata: {
      exportScript: 'scripts/qa/export-scenarios.mjs',
      scenario: 'navigation-annex'
    }
  },
  {
    slug: 'release-readiness-evidence',
    title: 'Release readiness checklist evidence',
    description: 'Manual QA checklist baseline, CAB approvals, and observability evidence packages.',
    dataScope: 'release',
    dataClassification: 'confidential',
    anonymisationStrategy: 'redacted-identifiers',
    seedCommand: 'npm run qa:manual-readiness',
    refreshCadence: 'per-release',
    storagePath: 'qa/reports/manual-qa-readiness.json',
    checksum: null,
    ownerTeam: 'release-operations',
    lastRefreshedAt: new Date('2025-01-14T12:00:00Z'),
    metadata: {
      checklistSource: 'qa/release/core_release_checklist.json'
    }
  }
];

const SANDBOXES = [
  {
    slug: 'qa-navigation-annex-staging',
    label: 'Navigation Annex QA Staging',
    environmentType: 'staging',
    fixtureSetSlug: 'navigation-annex-fixtures',
    accessUrl: 'https://staging.edulure.test/qa/navigation',
    region: 'us-east-1',
    ownerTeam: 'quality-engineering',
    seedScript: 'npm run qa:export-scenarios',
    refreshCadence: 'nightly',
    accessInstructions: 'Authenticate with QA SSO credentials. Environment resets nightly at 02:00 UTC.',
    status: 'active',
    lastRefreshedAt: new Date('2025-01-14T06:30:00Z'),
    metadata: {
      vpnRequired: true,
      contact: 'qa-oncall@edulure.com'
    }
  },
  {
    slug: 'qa-mobile-beta-lab',
    label: 'Mobile Beta Lab Sandbox',
    environmentType: 'beta',
    fixtureSetSlug: 'release-readiness-evidence',
    accessUrl: 'https://beta.edulure.test/mobile/qa',
    region: 'eu-west-1',
    ownerTeam: 'mobile-quality',
    seedScript: 'npm run qa:manual-readiness',
    refreshCadence: 'per-release',
    accessInstructions: 'Install beta build from TestFlight and provision credentials via mobile QA runbook.',
    status: 'active',
    lastRefreshedAt: new Date('2025-01-12T15:45:00Z'),
    metadata: {
      devicePool: ['iOS 17', 'Android 14'],
      vpnRequired: false
    }
  }
];

async function loadCoverageFixtures() {
  const backendSummaryPath = path.join(repoRoot, 'qa/fixtures/backend-coverage-summary.json');
  const frontendSummaryPath = path.join(repoRoot, 'qa/fixtures/frontend-coverage-summary.json');
  const flutterLcovPath = path.join(repoRoot, 'qa/fixtures/flutter-lcov.info');

  const [backendBuffer, frontendBuffer, flutterBuffer] = await Promise.all([
    fs.readFile(backendSummaryPath, 'utf8'),
    fs.readFile(frontendSummaryPath, 'utf8'),
    fs.readFile(flutterLcovPath, 'utf8')
  ]);

  return {
    backend: await parseVitestSummary(backendBuffer),
    frontend: await parseVitestSummary(frontendBuffer),
    flutter: await parseLcovReport(flutterBuffer)
  };
}

async function loadChecklist() {
  const checklistPath = path.join(repoRoot, 'qa/release/core_release_checklist.json');
  const raw = await fs.readFile(checklistPath, 'utf8');
  return JSON.parse(raw);
}

export async function seed(knex) {
  const coverageFixtures = await loadCoverageFixtures();
  const checklist = await loadChecklist();

  await knex.transaction(async (trx) => {
    await trx('qa_test_suite_runs').del();
    await trx('qa_test_suites').del();
    await trx('qa_test_surfaces').del();
    await trx('qa_manual_checklist_items').del();
    await trx('qa_manual_checklists').del();
    await trx('qa_sandbox_environments').del();
    await trx('qa_fixture_sets').del();

    const surfaceIdMap = new Map();
    for (const surface of SURFACES) {
      const [id] = await trx('qa_test_surfaces').insert({
        slug: surface.slug,
        display_name: surface.displayName,
        surface_type: surface.surfaceType,
        repository_path: surface.repositoryPath,
        owner_team: surface.ownerTeam,
        ci_identifier: surface.ciIdentifier,
        threshold_statements: surface.thresholds.statements,
        threshold_branches: surface.thresholds.branches,
        threshold_functions: surface.thresholds.functions,
        threshold_lines: surface.thresholds.lines,
        is_active: true,
        metadata: JSON.stringify(surface.metadata ?? {})
      });
      surfaceIdMap.set(surface.slug, id);
    }

    const suiteIdMap = new Map();
    for (const suite of SUITES) {
      const surfaceId = surfaceIdMap.get(suite.surfaceSlug);
      if (!surfaceId) {
        continue;
      }
      const [suiteId] = await trx('qa_test_suites').insert({
        surface_id: surfaceId,
        suite_key: suite.suiteKey,
        suite_type: suite.suiteType,
        description: suite.description,
        owner_email: suite.ownerEmail ?? null,
        ci_job: suite.ciJob ?? null,
        threshold_statements: suite.thresholds.statements,
        threshold_branches: suite.thresholds.branches,
        threshold_functions: suite.thresholds.functions,
        threshold_lines: suite.thresholds.lines,
        metadata: JSON.stringify(suite.metadata ?? {})
      });
      suiteIdMap.set(suite.suiteKey, suiteId);
    }

    const [checklistId] = await trx('qa_manual_checklists').insert({
      slug: 'core-release-readiness',
      title: checklist.title ?? 'Release readiness checklist',
      version: checklist.version ?? '1.0.0',
      status: 'active',
      owner_team: 'release-operations',
      description: checklist.description ?? 'Manual QA governance checklist for releases.',
      updated_by: 'qa-seed',
      metadata: JSON.stringify({
        source: 'qa/release/core_release_checklist.json',
        updatedAt: checklist.updatedAt ?? null
      })
    });

    let order = 0;
    for (const item of checklist.items ?? []) {
      await trx('qa_manual_checklist_items').insert({
        checklist_id: checklistId,
        item_key: item.id,
        label: item.description,
        category: item.owner ?? 'general',
        owner_team: item.owner ?? 'operations',
        requires_evidence: Array.isArray(item.evidence) && item.evidence.length > 0,
        default_status: item.status ?? 'pending',
        automation_type: 'manual',
        display_order: order,
        description: item.description,
        evidence_examples: JSON.stringify(item.evidence ?? []),
        metadata: JSON.stringify({
          lastVerifiedAt: item.lastVerifiedAt ?? null
        })
      });
      order += 1;
    }

    const fixtureIdMap = new Map();
    for (const fixture of FIXTURE_SETS) {
      const [fixtureId] = await trx('qa_fixture_sets').insert({
        slug: fixture.slug,
        title: fixture.title,
        description: fixture.description,
        data_scope: fixture.dataScope,
        data_classification: fixture.dataClassification,
        anonymisation_strategy: fixture.anonymisationStrategy ?? null,
        seed_command: fixture.seedCommand ?? null,
        refresh_cadence: fixture.refreshCadence ?? null,
        storage_path: fixture.storagePath ?? null,
        checksum: fixture.checksum ?? null,
        owner_team: fixture.ownerTeam,
        last_refreshed_at: fixture.lastRefreshedAt ?? null,
        metadata: JSON.stringify(fixture.metadata ?? {})
      });
      fixtureIdMap.set(fixture.slug, fixtureId);
    }

    for (const sandbox of SANDBOXES) {
      await trx('qa_sandbox_environments').insert({
        slug: sandbox.slug,
        label: sandbox.label,
        environment_type: sandbox.environmentType,
        fixture_set_id: fixtureIdMap.get(sandbox.fixtureSetSlug) ?? null,
        access_url: sandbox.accessUrl ?? null,
        region: sandbox.region ?? null,
        owner_team: sandbox.ownerTeam,
        seed_script: sandbox.seedScript ?? null,
        refresh_cadence: sandbox.refreshCadence ?? null,
        access_instructions: sandbox.accessInstructions ?? null,
        status: sandbox.status ?? 'active',
        last_refreshed_at: sandbox.lastRefreshedAt ?? null,
        metadata: JSON.stringify(sandbox.metadata ?? {})
      });
    }

    const runTemplates = [
      {
        suiteKey: 'backend',
        fixture: coverageFixtures.backend,
        reportUrl: 'https://ci.edulure.com/jobs/backend/coverage',
        evidenceUrl: 'https://ci.edulure.com/jobs/backend/report',
        totalTests: 468,
        passedTests: 468,
        completedAt: new Date('2025-01-14T08:05:00Z')
      },
      {
        suiteKey: 'frontend',
        fixture: coverageFixtures.frontend,
        reportUrl: 'https://ci.edulure.com/jobs/frontend/coverage',
        evidenceUrl: 'https://ci.edulure.com/jobs/frontend/report',
        totalTests: 312,
        passedTests: 312,
        completedAt: new Date('2025-01-14T08:15:00Z')
      },
      {
        suiteKey: 'flutter',
        fixture: coverageFixtures.flutter,
        reportUrl: 'https://ci.edulure.com/jobs/flutter/coverage',
        evidenceUrl: 'https://ci.edulure.com/jobs/flutter/report',
        totalTests: 210,
        passedTests: 205,
        completedAt: new Date('2025-01-14T08:25:00Z')
      }
    ];

    for (const template of runTemplates) {
      const suiteId = suiteIdMap.get(template.suiteKey);
      if (!suiteId || !template.fixture) {
        continue;
      }
      await trx('qa_test_suite_runs').insert({
        suite_id: suiteId,
        run_identifier: `seed-${template.suiteKey}-coverage`,
        git_commit: 'seeded-fixtures',
        git_branch: 'main',
        environment: 'staging',
        status: 'passed',
        triggered_by: 'qa-seed',
        coverage_statements: template.fixture.statements ?? 0,
        coverage_branches: template.fixture.branches ?? 0,
        coverage_functions: template.fixture.functions ?? 0,
        coverage_lines: template.fixture.lines ?? 0,
        failure_rate: template.suiteKey === 'flutter' ? 0.02 : 0,
        total_tests: template.totalTests ?? null,
        passed_tests: template.passedTests ?? null,
        report_url: template.reportUrl,
        evidence_url: template.evidenceUrl,
        metadata: JSON.stringify({
          seed: true,
          coverageFixture: template.suiteKey
        }),
        started_at: new Date('2025-01-14T08:00:00Z'),
        completed_at: template.completedAt
      });
    }
  });
}
