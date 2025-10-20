import { describe, expect, it } from 'vitest';

import AssetConversionOutputModel from '../src/models/AssetConversionOutputModel.js';
import AssetIngestionJobModel from '../src/models/AssetIngestionJobModel.js';

describe('AssetConversionOutputModel.deserialize', () => {
  it('recovers gracefully from malformed metadata', () => {
    const result = AssetConversionOutputModel.deserialize({
      id: 1,
      assetId: 2,
      format: 'mp4',
      metadata: '{bad-json'
    });

    expect(result.metadata).toEqual({});
  });
});

describe('AssetIngestionJobModel.deserialize', () => {
  it('falls back to empty metadata when stored JSON is invalid', () => {
    const result = AssetIngestionJobModel.deserialize({
      id: 10,
      assetId: 20,
      jobType: 'thumbnail',
      status: 'failed',
      attempts: 3,
      resultMetadata: '---not-json---'
    });

    expect(result.resultMetadata).toEqual({});
  });
});

