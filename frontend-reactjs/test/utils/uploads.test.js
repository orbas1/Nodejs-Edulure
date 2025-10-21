import { afterEach, describe, expect, it, vi } from 'vitest';

import { computeFileChecksum } from '../../src/utils/uploads.js';

describe('uploads utilities', () => {
  let stubCrypto;
  let cryptoGetter;

  beforeEach(() => {
    stubCrypto = {
      subtle: {
        digest: vi.fn(async (_algorithm, buffer) => {
          const view = new Uint8Array(buffer);
          const reversed = Uint8Array.from(view).reverse();
          return reversed.buffer;
        })
      }
    };
    cryptoGetter = vi.spyOn(globalThis, 'crypto', 'get').mockReturnValue(stubCrypto);
  });

  afterEach(() => {
    cryptoGetter.mockRestore();
  });

  it('computes a checksum for a provided file', async () => {
    const file = {
      arrayBuffer: () => Promise.resolve(Uint8Array.from([1, 2, 3, 4]).buffer)
    };
    const checksum = await computeFileChecksum(file);
    expect(checksum).toMatch(/^[0-9a-f]+$/);
    expect(checksum.length).toBeGreaterThan(0);
  });

  it('honours a custom hashing algorithm', async () => {
    const file = {
      arrayBuffer: () => Promise.resolve(Uint8Array.from([5, 6, 7, 8]).buffer)
    };
    await computeFileChecksum(file, { algorithm: 'SHA-1' });
    expect(stubCrypto.subtle.digest).toHaveBeenCalledWith('SHA-1', expect.any(ArrayBuffer));
  });

  it('throws when secure hashing unavailable', async () => {
    cryptoGetter.mockReturnValue({});
    await expect(computeFileChecksum(new Blob([1]))).rejects.toThrow('Secure hashing is not available');
    cryptoGetter.mockReturnValue(stubCrypto);
  });
});
