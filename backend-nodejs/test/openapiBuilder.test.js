import { mkdtempSync, promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { generateServiceSpecs } from '../src/docs/builders/openapiBuilder.js';

const BASE_SPEC_PATH = path.join(process.cwd(), 'src/docs/openapi.json');

describe('generateServiceSpecs', () => {
  const tempDirs = [];

  afterEach(async () => {
    while (tempDirs.length) {
      const dir = tempDirs.pop();
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('returns sorted descriptors and writes deterministic files', async () => {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'openapi-specs-'));
    tempDirs.push(tmpDir);

    const services = generateServiceSpecs({ baseSpecPath: BASE_SPEC_PATH, outputDir: tmpDir });

    expect(services.length).toBeGreaterThan(0);
    const serviceNames = services.map((service) => service.service);
    const sortedNames = [...serviceNames].sort();
    expect(serviceNames).toEqual(sortedNames);

    const indexContent = await fs.readFile(path.join(tmpDir, 'index.json'), 'utf8');
    const indexJson = JSON.parse(indexContent);
    expect(indexJson.services).toHaveLength(services.length);

    const first = services[0];
    const specPath = path.join(tmpDir, first.service, first.version, 'openapi.json');
    const spec = JSON.parse(await fs.readFile(specPath, 'utf8'));

    expect(Object.keys(spec.paths).length).toBeGreaterThan(0);
    for (const key of Object.keys(spec.paths)) {
      expect(key.startsWith(first.basePath)).toBe(true);
    }
  });
});
