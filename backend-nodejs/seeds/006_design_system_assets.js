import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOKENS_TABLE = 'design_system_tokens';
const RESEARCH_TABLE = 'ux_research_insights';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const tokensPath = path.resolve(repoRoot, 'docs', 'design-system', 'design_tokens.json');
const researchPath = path.resolve(repoRoot, 'docs', 'design-system', 'research_insights.json');

function serialiseJson(value) {
  return JSON.stringify(value ?? (Array.isArray(value) ? [] : {}));
}

function categoriseToken(key) {
  if (!key || typeof key !== 'string') {
    return 'general';
  }
  const trimmed = key.replace(/^--/, '');
  const segment = trimmed.split('-')[0];
  if (!segment) {
    return 'general';
  }
  const known = new Set([
    'color',
    'gradient',
    'shadow',
    'font',
    'space',
    'radius',
    'screen',
    'form',
    'motion',
    'media',
    'skeleton',
    'overlay',
    'grid'
  ]);
  return known.has(segment) ? segment : 'general';
}

function flattenTokenRecords(json) {
  const results = [];
  let order = 1;

  const pushRecord = ({ key, value, source, context = null, selector }) => {
    if (!key || value === undefined || value === null) {
      return;
    }
    results.push({
      token_key: key,
      token_value: String(value),
      source,
      context,
      selector,
      token_category: categoriseToken(key),
      display_order: order++,
      metadata: {
        version: json.version ?? null,
        source,
        context,
        selector
      }
    });
  };

  const base = json.base ?? {};
  for (const [key, value] of Object.entries(base)) {
    pushRecord({ key, value, source: 'base', context: null, selector: ':root' });
  }

  const overrides = json.overrides ?? {};
  for (const [atRule, selectorMap] of Object.entries(overrides)) {
    for (const [selector, declarations] of Object.entries(selectorMap ?? {})) {
      for (const [key, value] of Object.entries(declarations ?? {})) {
        pushRecord({ key, value, source: 'media', context: atRule, selector });
      }
    }
  }

  const dataOverrides = json.dataOverrides ?? {};
  for (const [selector, declarations] of Object.entries(dataOverrides)) {
    for (const [key, value] of Object.entries(declarations ?? {})) {
      pushRecord({ key, value, source: 'data', context: null, selector });
    }
  }

  return results.map((record) => ({
    ...record,
    metadata: serialiseJson(record.metadata)
  }));
}

function buildResearchRecords(json) {
  const version = json.version ?? null;
  return (json.insights ?? []).map((insight, index) => ({
    slug: insight.slug,
    title: insight.title,
    status: insight.status,
    recorded_at: insight.recordedAt,
    owner: insight.owner,
    summary: insight.summary,
    tokens_impacted: serialiseJson(insight.tokensImpacted ?? []),
    documents: serialiseJson(insight.documents ?? []),
    participants: serialiseJson(insight.participants ?? []),
    evidence_url: insight.evidenceUrl ?? null,
    metadata: serialiseJson({ version, index })
  }));
}

export async function seed(knex) {
  const [tokenJsonRaw, researchJsonRaw] = await Promise.all([
    fs.readFile(tokensPath, 'utf8'),
    fs.readFile(researchPath, 'utf8')
  ]);

  const tokensJson = JSON.parse(tokenJsonRaw);
  const researchJson = JSON.parse(researchJsonRaw);

  const tokenRecords = flattenTokenRecords(tokensJson);
  const researchRecords = buildResearchRecords(researchJson);

  await knex.transaction(async (trx) => {
    await trx(TOKENS_TABLE).del();
    if (tokenRecords.length) {
      await trx(TOKENS_TABLE).insert(tokenRecords);
    }

    await trx(RESEARCH_TABLE).del();
    if (researchRecords.length) {
      await trx(RESEARCH_TABLE).insert(researchRecords);
    }
  });
}
