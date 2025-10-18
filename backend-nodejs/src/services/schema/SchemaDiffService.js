import crypto from 'crypto';

function sortArray(value) {
  if (!Array.isArray(value)) {
    return value;
  }
  return [...value].sort();
}

export class SchemaDiffService {
  constructor({ snapshot, actual } = {}) {
    this.snapshot = snapshot ?? { tables: {}, enums: {}, views: {} };
    this.actual = actual ?? { tables: {}, enums: {}, views: {} };
  }

  static hashDefinition(value) {
    const normalised = (value ?? '')
      .toString()
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
    return crypto.createHash('sha256').update(normalised).digest('hex');
  }

  diff() {
    const diffs = {
      missingTables: [],
      extraTables: [],
      columnDrift: [],
      indexDrift: [],
      enumDrift: [],
      viewDrift: []
    };

    const snapshotTables = Object.keys(this.snapshot.tables ?? {});
    const actualTables = Object.keys(this.actual.tables ?? {});

    for (const table of snapshotTables) {
      if (!this.actual.tables?.[table]) {
        diffs.missingTables.push(table);
      }
    }

    for (const table of actualTables) {
      if (!this.snapshot.tables?.[table]) {
        diffs.extraTables.push(table);
      }
    }

    for (const table of snapshotTables) {
      const snapshotTable = this.snapshot.tables?.[table];
      const actualTable = this.actual.tables?.[table];
      if (!snapshotTable || !actualTable) {
        continue;
      }

      const snapshotColumns = snapshotTable.columns ?? {};
      const actualColumns = actualTable.columns ?? {};

      for (const columnName of Object.keys(snapshotColumns)) {
        const expected = snapshotColumns[columnName];
        const actual = actualColumns[columnName];
        if (!actual) {
          diffs.columnDrift.push({ table, column: columnName, issue: 'missing-column' });
          continue;
        }

        if ((expected.type ?? '').toLowerCase() !== (actual.type ?? '').toLowerCase()) {
          diffs.columnDrift.push({ table, column: columnName, issue: 'type-mismatch', expected: expected.type, actual: actual.type });
        }

        if (Boolean(expected.nullable) !== Boolean(actual.nullable)) {
          diffs.columnDrift.push({ table, column: columnName, issue: 'nullability-mismatch', expected: expected.nullable, actual: actual.nullable });
        }

        const expectedDefault = expected.defaultValue ?? null;
        const actualDefault = actual.defaultValue ?? null;
        if ((expectedDefault ?? null) !== (actualDefault ?? null)) {
          diffs.columnDrift.push({ table, column: columnName, issue: 'default-mismatch', expected: expectedDefault, actual: actualDefault });
        }
      }

      for (const columnName of Object.keys(actualColumns)) {
        if (!snapshotColumns[columnName]) {
          diffs.columnDrift.push({ table, column: columnName, issue: 'unexpected-column' });
        }
      }

      const snapshotIndexes = snapshotTable.indexes ?? {};
      const actualIndexes = actualTable.indexes ?? {};

      for (const indexName of Object.keys(snapshotIndexes)) {
        const expectedIndex = snapshotIndexes[indexName];
        const actualIndex = actualIndexes[indexName];
        if (!actualIndex) {
          diffs.indexDrift.push({ table, index: indexName, issue: 'missing-index' });
          continue;
        }

        if (Boolean(expectedIndex.unique) !== Boolean(actualIndex.unique)) {
          diffs.indexDrift.push({ table, index: indexName, issue: 'uniqueness-mismatch', expected: expectedIndex.unique, actual: actualIndex.unique });
        }

        const expectedColumns = sortArray(expectedIndex.columns ?? []);
        const actualColumnsSorted = sortArray(actualIndex.columns ?? []);
        if (expectedColumns.join(',') !== actualColumnsSorted.join(',')) {
          diffs.indexDrift.push({ table, index: indexName, issue: 'column-order-mismatch', expected: expectedColumns, actual: actualColumnsSorted });
        }
      }

      for (const indexName of Object.keys(actualIndexes)) {
        if (!snapshotIndexes[indexName]) {
          diffs.indexDrift.push({ table, index: indexName, issue: 'unexpected-index' });
        }
      }
    }

    const snapshotEnums = this.snapshot.enums ?? {};
    const actualEnums = this.actual.enums ?? {};

    for (const enumName of Object.keys(snapshotEnums)) {
      const expectedValues = sortArray(snapshotEnums[enumName] ?? []);
      const actualValues = sortArray(actualEnums[enumName] ?? []);
      if (expectedValues.join(',') !== actualValues.join(',')) {
        diffs.enumDrift.push({ enum: enumName, expected: expectedValues, actual: actualValues });
      }
    }

    for (const enumName of Object.keys(actualEnums)) {
      if (!snapshotEnums[enumName]) {
        diffs.enumDrift.push({ enum: enumName, expected: [], actual: sortArray(actualEnums[enumName] ?? []) });
      }
    }

    const snapshotViews = this.snapshot.views ?? {};
    const actualViews = this.actual.views ?? {};
    for (const viewName of Object.keys(snapshotViews)) {
      const expected = snapshotViews[viewName];
      const actual = actualViews[viewName];
      if (!actual) {
        diffs.viewDrift.push({ view: viewName, issue: 'missing-view' });
        continue;
      }

      const expectedHash = expected.definitionHash ?? SchemaDiffService.hashDefinition(expected.definition);
      const actualHash = actual.definitionHash ?? SchemaDiffService.hashDefinition(actual.definition);
      if (expectedHash !== actualHash) {
        diffs.viewDrift.push({ view: viewName, issue: 'definition-mismatch', expectedHash, actualHash });
      }
    }

    for (const viewName of Object.keys(actualViews)) {
      if (!snapshotViews[viewName]) {
        diffs.viewDrift.push({ view: viewName, issue: 'unexpected-view' });
      }
    }

    return diffs;
  }
}

export default SchemaDiffService;
