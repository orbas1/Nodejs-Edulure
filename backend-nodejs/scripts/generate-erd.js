import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

import dotenv from 'dotenv';
import knexFactory from 'knex';

import { TABLES as COMPLIANCE_TABLES } from '../src/database/domains/compliance.js';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const envPath = path.resolve(projectRoot, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const knexConfig = require('../knexfile.cjs');

function resolveDomainConfig(domain) {
  if (domain === 'compliance') {
    return {
      tables: Object.values(COMPLIANCE_TABLES),
      output: path.resolve(projectRoot, 'database/erd/compliance.puml'),
      title: 'Compliance & Governance Domain'
    };
  }

  throw new Error(`Unsupported domain "${domain}". Supported domains: compliance`);
}

function formatColumn(column) {
  const nullable = column.isNullable === 'YES' ? 'nullable' : 'not null';
  const defaultValue = column.columnDefault ? ` = ${column.columnDefault}` : '';
  const type = `${column.dataType}${column.characterMaximumLength ? `(${column.characterMaximumLength})` : ''}`;
  const key = column.columnKey === 'PRI' ? ' <<PK>>' : column.columnKey === 'UNI' ? ' <<UQ>>' : '';
  return `  ${column.columnName}: ${type}${defaultValue} {${nullable}}${key}`;
}

function formatRelationship(fk) {
  return `"${fk.table_name}" --> "${fk.referenced_table_name}" : ${fk.column_name} → ${fk.referenced_column_name}`;
}

async function fetchSchemaMetadata(knex, domainConfig) {
  const databaseName = knexConfig.connection.database;
  const tables = domainConfig.tables;

  const columns = await knex('information_schema.columns')
    .select(
      'table_name as tableName',
      'column_name as columnName',
      'data_type as dataType',
      'is_nullable as isNullable',
      'column_key as columnKey',
      'column_default as columnDefault',
      'character_maximum_length as characterMaximumLength',
      'ordinal_position as ordinalPosition'
    )
    .whereIn('table_name', tables)
    .andWhere('table_schema', databaseName)
    .orderBy('table_name', 'asc')
    .orderBy('ordinal_position', 'asc');

  const foreignKeys = await knex('information_schema.KEY_COLUMN_USAGE')
    .select(
      'TABLE_NAME as table_name',
      'COLUMN_NAME as column_name',
      'REFERENCED_TABLE_NAME as referenced_table_name',
      'REFERENCED_COLUMN_NAME as referenced_column_name'
    )
    .whereIn('TABLE_NAME', tables)
    .andWhereNotNull('REFERENCED_TABLE_NAME')
    .andWhere('TABLE_SCHEMA', databaseName);

  return { columns, foreignKeys };
}

function buildPlantUml(domainConfig, metadata) {
  const lines = [];
  lines.push('@startuml');
  lines.push('hide circle');
  lines.push('skinparam handwritten false');
  lines.push('skinparam roundcorner 12');
  lines.push(`title ${domainConfig.title}`);
  lines.push('');

  const groupedColumns = metadata.columns.reduce((acc, column) => {
    if (!acc.has(column.tableName)) {
      acc.set(column.tableName, []);
    }
    acc.get(column.tableName).push(column);
    return acc;
  }, new Map());

  for (const tableName of domainConfig.tables) {
    const tableColumns = groupedColumns.get(tableName) ?? [];
    lines.push(`class "${tableName}" {`);
    tableColumns.forEach((column) => {
      lines.push(formatColumn(column));
    });
    lines.push('}');
    lines.push('');
  }

  metadata.foreignKeys.forEach((fk) => {
    lines.push(formatRelationship(fk));
  });

  lines.push('');
  lines.push('@enduml');
  return lines.join('\n');
}

async function generateDiagram(domain) {
  const domainConfig = resolveDomainConfig(domain);
  const knex = knexFactory(knexConfig);

  try {
    const metadata = await fetchSchemaMetadata(knex, domainConfig);
    const diagram = buildPlantUml(domainConfig, metadata);
    await fs.promises.writeFile(domainConfig.output, diagram, 'utf8');
    console.log(`ERD generated for domain "${domain}" at ${domainConfig.output}`);
  } finally {
    await knex.destroy();
  }
}

function parseArgs(argv) {
  const [, , domain = 'compliance'] = argv;
  return { domain };
}

const { domain } = parseArgs(process.argv);

generateDiagram(domain).catch((error) => {
  console.error('Failed to generate ERD', error);
  process.exitCode = 1;
});
