#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { instantiateNavigationAnnexScenario, navigationAnnexScenario } from '../../qa/test-data/navigationAnnex.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');

async function main() {
  const scenario = instantiateNavigationAnnexScenario();
  const outputPath = path.resolve(repoRoot, 'qa/reports/navigation-annex-scenario.json');
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    JSON.stringify(
      {
        metadata: {
          generatedAt: new Date().toISOString(),
          description: 'Canonical navigation annex fixtures reused by automated tests and QA sandboxes'
        },
        scenario: {
          ...scenario,
          quickActions: navigationAnnexScenario.quickActions,
          annexQuickActions: navigationAnnexScenario.annexQuickActions
        }
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`Scenario exported to ${path.relative(repoRoot, outputPath)}`);
}

main().catch((error) => {
  console.error(`Failed to export scenarios: ${error.message}`);
  process.exit(1);
});
