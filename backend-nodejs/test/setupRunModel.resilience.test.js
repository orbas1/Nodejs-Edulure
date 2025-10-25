import { describe, expect, it } from 'vitest';

import SetupRunModel from '../src/models/SetupRunModel.js';

describe('SetupRunModel.listRecent resilience', () => {
  it('returns an empty history when the setup_runs table is missing', async () => {
    const error = new Error('select * from setup_runs - SQLITE_ERROR: no such table: setup_runs');
    error.code = 'SQLITE_ERROR';

    const connection = () => ({
      select: () => ({
        orderBy: () => ({
          limit: () => Promise.reject(error)
        })
      })
    });

    const result = await SetupRunModel.listRecent(5, connection);
    expect(result).toEqual([]);
  });

  it('returns an empty history when the database connection cannot be invoked', async () => {
    const connection = () => {
      throw new TypeError('connection is not a function');
    };

    const result = await SetupRunModel.listRecent(5, connection);
    expect(result).toEqual([]);
  });
});
