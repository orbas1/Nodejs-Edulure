import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { apiRouteMetadata } from '../../routes/routeMetadata.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '../../..');

function normaliseServiceName(name) {
  const slug = String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'service';
}

function deepClone(value) {
  if (value === undefined) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
}

function collectComponentRefs(node, accumulator = new Set()) {
  if (!node || typeof node !== 'object') {
    return accumulator;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectComponentRefs(item, accumulator);
    }
    return accumulator;
  }

  if (typeof node.$ref === 'string') {
    accumulator.add(node.$ref);
  }

  for (const value of Object.values(node)) {
    collectComponentRefs(value, accumulator);
  }

  return accumulator;
}

function expandComponentGraph(baseSpec, references) {
  const visited = new Set();
  const queue = [...references];

  while (queue.length > 0) {
    const ref = queue.pop();
    if (visited.has(ref)) {
      continue;
    }

    visited.add(ref);

    if (!ref.startsWith('#/components/')) {
      continue;
    }

    const [, , componentType, componentName] = ref.split('/');
    const componentGroup = baseSpec.components?.[componentType];
    if (!componentGroup) {
      continue;
    }

    const component = componentGroup[componentName];
    if (!component) {
      continue;
    }

    const nestedRefs = collectComponentRefs(component);
    for (const nestedRef of nestedRefs) {
      if (!visited.has(nestedRef)) {
        queue.push(nestedRef);
      }
    }
  }

  return visited;
}

function extractComponents(baseSpec, referencedRefs) {
  if (!baseSpec.components) {
    return undefined;
  }

  const componentMap = {};

  for (const ref of referencedRefs) {
    if (!ref.startsWith('#/components/')) {
      continue;
    }
    const [, , componentType, componentName] = ref.split('/');
    if (!componentMap[componentType]) {
      componentMap[componentType] = {};
    }

    const component = baseSpec.components?.[componentType]?.[componentName];
    if (component) {
      componentMap[componentType][componentName] = deepClone(component);
    }
  }

  return Object.keys(componentMap).length > 0 ? componentMap : undefined;
}

function collectTagsFromPaths(paths) {
  const tags = new Set();
  for (const pathItem of Object.values(paths)) {
    for (const operation of Object.values(pathItem)) {
      if (!operation || typeof operation !== 'object') {
        continue;
      }
      if (Array.isArray(operation.tags)) {
        for (const tag of operation.tags) {
          tags.add(tag);
        }
      }
    }
  }
  return Array.from(tags);
}

function extractServicePaths(paths = {}, basePath) {
  if (!basePath) {
    return {};
  }

  const entries = Object.entries(paths).filter(([pathKey]) => pathKey.startsWith(basePath));
  entries.sort(([pathA], [pathB]) => pathA.localeCompare(pathB));

  return entries.reduce((acc, [pathKey, pathValue]) => {
    acc[pathKey] = deepClone(pathValue);
    return acc;
  }, {});
}

export function generateServiceSpecs({
  baseSpecPath = path.join(ROOT_DIR, 'src/docs/openapi.json'),
  outputDir,
  version = 'v1',
  services: allowedServices
} = {}) {
  const specContents = readFileSync(baseSpecPath, 'utf8');
  const baseSpec = JSON.parse(specContents);

  const services = [];
  const normalisedFilters = Array.isArray(allowedServices)
    ? allowedServices
        .map((entry) => (typeof entry === 'string' ? entry.toLowerCase().trim() : ''))
        .filter((entry) => entry.length > 0)
    : [];

  for (const entry of apiRouteMetadata) {
    const serviceName = normaliseServiceName(entry.name);
    const servicePaths = extractServicePaths(baseSpec.paths, entry.basePath);

    if (Object.keys(servicePaths).length === 0) {
      continue;
    }

    const referencedRefs = collectComponentRefs(servicePaths);
    const expandedRefs = expandComponentGraph(baseSpec, referencedRefs);
    const components = extractComponents(baseSpec, expandedRefs);
    const tags = collectTagsFromPaths(servicePaths);

    const serviceSpec = {
      openapi: baseSpec.openapi,
      info: {
        ...deepClone(baseSpec.info),
        title: `${baseSpec.info.title} – ${entry.description}`,
        description: `${entry.description} (Capability: ${entry.capability}).`
      },
      servers: deepClone(baseSpec.servers ?? []),
      tags: tags.length > 0 ? deepClone(baseSpec.tags?.filter((tag) => tags.includes(tag.name)) ?? []) : undefined,
      paths: servicePaths,
      components
    };

    const descriptor = {
      service: serviceName,
      name: entry.name,
      capability: entry.capability,
      basePath: entry.basePath,
      version,
      description: entry.description,
      spec: serviceSpec
    };

    services.push(descriptor);
  }

  services.sort((a, b) => a.service.localeCompare(b.service));

  if (outputDir) {
    for (const descriptor of services) {
      const serviceDir = path.join(outputDir, descriptor.service, descriptor.version);
      mkdirSync(serviceDir, { recursive: true });
      writeFileSync(path.join(serviceDir, 'openapi.json'), JSON.stringify(descriptor.spec, null, 2));
    }

    const indexPayload = services.map((descriptor) => ({
      service: descriptor.service,
      name: descriptor.name,
      capability: descriptor.capability,
      version: descriptor.version,
      description: descriptor.description,
      basePath: descriptor.basePath,
      file: `./${descriptor.service}/${descriptor.version}/openapi.json`
    }));

    mkdirSync(outputDir, { recursive: true });
    writeFileSync(
      path.join(outputDir, 'index.json'),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          baseSpec: path.relative(outputDir, baseSpecPath),
          services: indexPayload
        },
        null,
        2
      )
    );
  }

  return services;
}

export default generateServiceSpecs;
