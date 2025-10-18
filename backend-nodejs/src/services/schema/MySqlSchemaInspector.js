import db from '../../config/database.js';
import SchemaDiffService from './SchemaDiffService.js';

export class MySqlSchemaInspector {
  constructor({ knex = db, schema } = {}) {
    this.knex = knex;
    this.schema = schema ?? knex?.client?.config?.connection?.database;
    if (!this.schema) {
      throw new Error('MySqlSchemaInspector requires a schema name.');
    }
  }

  async loadColumns() {
    const rows = await this.knex
      .select([
        'TABLE_NAME as table',
        'COLUMN_NAME as column',
        'COLUMN_TYPE as type',
        'IS_NULLABLE as isNullable',
        'COLUMN_DEFAULT as defaultValue'
      ])
      .from('information_schema.COLUMNS')
      .where('TABLE_SCHEMA', this.schema);

    const tables = {};
    for (const row of rows) {
      const table = row.table;
      if (!tables[table]) {
        tables[table] = { columns: {}, indexes: {} };
      }
      tables[table].columns[row.column] = {
        type: row.type,
        nullable: row.isNullable === 'YES',
        defaultValue: row.defaultValue
      };
    }

    return tables;
  }

  async loadIndexes() {
    const rows = await this.knex
      .select([
        'TABLE_NAME as table',
        'INDEX_NAME as index',
        'NON_UNIQUE as nonUnique',
        'COLUMN_NAME as column',
        'SEQ_IN_INDEX as position'
      ])
      .from('information_schema.STATISTICS')
      .where('TABLE_SCHEMA', this.schema);

    const tables = {};
    for (const row of rows) {
      const table = row.table;
      if (!tables[table]) {
        tables[table] = {};
      }
      if (!tables[table][row.index]) {
        tables[table][row.index] = { columns: [], unique: row.nonUnique === 0 };
      }
      tables[table][row.index].columns[row.position - 1] = row.column;
    }

    for (const table of Object.keys(tables)) {
      for (const indexName of Object.keys(tables[table])) {
        tables[table][indexName].columns = tables[table][indexName].columns.filter(Boolean);
      }
    }

    return tables;
  }

  async loadEnums() {
    const rows = await this.knex
      .select([
        'COLUMN_NAME as column',
        'TABLE_NAME as table',
        'COLUMN_TYPE as columnType'
      ])
      .from('information_schema.COLUMNS')
      .where('TABLE_SCHEMA', this.schema)
      .andWhere('DATA_TYPE', 'enum');

    const enums = {};
    for (const row of rows) {
      const match = row.columnType.match(/^enum\((.*)\)$/i);
      if (!match) {
        continue;
      }
      const values = match[1]
        .split(',')
        .map((value) => value.trim().replace(/^'(.*)'$/, '$1'));
      enums[`${row.table}.${row.column}`] = values;
    }

    return enums;
  }

  async loadViews() {
    const rows = await this.knex
      .select([
        'TABLE_NAME as view',
        'VIEW_DEFINITION as definition'
      ])
      .from('information_schema.VIEWS')
      .where('TABLE_SCHEMA', this.schema);

    const views = {};
    for (const row of rows) {
      views[row.view] = {
        definition: row.definition,
        definitionHash: SchemaDiffService.hashDefinition(row.definition)
      };
    }
    return views;
  }

  async describe() {
    const [columns, indexes, enums, views] = await Promise.all([
      this.loadColumns(),
      this.loadIndexes(),
      this.loadEnums(),
      this.loadViews()
    ]);

    const tables = {};
    for (const table of Object.keys(columns)) {
      tables[table] = {
        columns: columns[table],
        indexes: indexes[table] ?? {}
      };
    }

    return { tables, enums, views };
  }
}

export default MySqlSchemaInspector;
