import { describe, expect, it, vi } from 'vitest';

import {
  applyEnvironmentFilter,
  buildEnvironmentColumns,
  formatEnvironmentResponse,
  getEnvironmentDescriptor
} from '../../src/utils/environmentContext.js';

describe('environmentContext utilities', () => {
  it('builds a descriptor with slugified keys and defaults', () => {
    const descriptor = getEnvironmentDescriptor({
      name: 'Staging QA',
      tier: 'Staging',
      region: 'eu-west-1',
      workspace: 'ops-hq'
    });

    expect(descriptor).toEqual(
      expect.objectContaining({
        key: 'staging-qa',
        name: 'Staging QA',
        tier: 'Staging',
        region: 'eu-west-1',
        workspace: 'ops-hq'
      })
    );
  });

  it('produces database columns with canonical field names', () => {
    const descriptor = getEnvironmentDescriptor({
      key: 'production',
      name: 'Production',
      tier: 'prod',
      region: 'us-east-1',
      workspace: null
    });

    const columns = buildEnvironmentColumns(descriptor);

    expect(columns).toEqual({
      environment_key: 'production',
      environment_name: 'Production',
      environment_tier: 'prod',
      environment_region: 'us-east-1',
      environment_workspace: null
    });
  });

  it('formats a response payload omitting provider fields', () => {
    const descriptor = getEnvironmentDescriptor({
      key: 'staging',
      name: 'Staging',
      tier: 'preprod',
      region: 'eu-central-1',
      workspace: 'ops'
    });

    expect(formatEnvironmentResponse(descriptor)).toEqual({
      key: 'staging',
      name: 'Staging',
      tier: 'preprod',
      region: 'eu-central-1',
      workspace: 'ops'
    });
  });

  it('applies environment filters to query builders', () => {
    const where = vi.fn().mockReturnThis();
    const builder = { where };

    const result = applyEnvironmentFilter(builder, { key: 'staging' });

    expect(result).toBe(builder);
    expect(where).toHaveBeenCalledWith('environment_key', 'staging');
  });
});
