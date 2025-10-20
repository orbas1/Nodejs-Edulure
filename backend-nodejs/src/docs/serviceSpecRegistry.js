import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_ROOT = path.join(__dirname, 'generated');

let cachedRegistry;
const specCache = new Map();

const REQUIRED_DESCRIPTOR_FIELDS = ['service', 'capability', 'description', 'version'];

function normalizeServiceKey(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim().toLowerCase();
}

function ensureLeadingSlash(value, fallback) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return `/${fallback}`;
  }

  if (/\s/u.test(trimmed)) {
    throw new Error(`Base path for service '${fallback}' must not contain whitespace.`);
  }

  const withoutPrefix = trimmed.replace(/^\/+/u, '');
  return `/${withoutPrefix}`;
}

function readJsonFile(filePath, contextLabel) {
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch (error) {
    const wrapped = new Error(`${contextLabel} not found at ${filePath}`);
    wrapped.cause = error;
    wrapped.code = error.code;
    throw wrapped;
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    const wrapped = new Error(`Unable to parse ${contextLabel} at ${filePath}: ${error.message}`);
    wrapped.cause = error;
    throw wrapped;
  }
}

function resolveDocumentPath(rawFile, serviceId, version) {
  const defaultPath = path.join(serviceId, version, 'openapi.json');
  const candidate = String(rawFile ?? defaultPath).trim().replace(/^\.\//u, '');
  const resolvedPath = path.resolve(GENERATED_ROOT, candidate);

  if (!resolvedPath.startsWith(GENERATED_ROOT)) {
    throw new Error(
      `OpenAPI document for service '${serviceId}' resolved outside of generated spec directory`
    );
  }

  return resolvedPath;
}

function sanitizeDescriptor(rawDescriptor, indexPath, descriptorIndex) {
  if (!rawDescriptor || typeof rawDescriptor !== 'object') {
    throw new Error(
      `OpenAPI index at ${indexPath} contains an invalid descriptor at position ${descriptorIndex}`
    );
  }

  for (const field of REQUIRED_DESCRIPTOR_FIELDS) {
    if (!rawDescriptor[field]) {
      throw new Error(
        `OpenAPI index at ${indexPath} is missing required field '${field}' for descriptor ${descriptorIndex}`
      );
    }
  }

  const serviceId = String(rawDescriptor.service).trim();
  if (!serviceId) {
    throw new Error(
      `OpenAPI index at ${indexPath} declares an empty service identifier for descriptor ${descriptorIndex}`
    );
  }

  const name = rawDescriptor.name ? String(rawDescriptor.name).trim() : serviceId;
  const capability = String(rawDescriptor.capability).trim();
  const version = String(rawDescriptor.version).trim();
  const description = String(rawDescriptor.description).trim();

  if (!capability || !version || !description) {
    throw new Error(
      `OpenAPI index at ${indexPath} is missing required metadata for service '${serviceId}'.`
    );
  }
  const basePath = ensureLeadingSlash(rawDescriptor.basePath, serviceId);
  const documentPath = resolveDocumentPath(rawDescriptor.file, serviceId, version);

  return {
    service: serviceId,
    name,
    capability,
    version,
    description,
    basePath,
    documentPath
  };
}

function cloneValue(value) {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function loadRegistry() {
  if (cachedRegistry) {
    return cachedRegistry;
  }

  const indexPath = path.join(GENERATED_ROOT, 'index.json');
  const indexJson = readJsonFile(indexPath, 'OpenAPI service index');

  if (!Array.isArray(indexJson?.services)) {
    throw new Error(`OpenAPI index at ${indexPath} must contain a 'services' array.`);
  }

  const descriptors = indexJson.services.map((descriptor, idx) =>
    sanitizeDescriptor(descriptor, indexPath, idx)
  );

  const lookup = new Map();
  for (const descriptor of descriptors) {
    const aliases = new Set([descriptor.service, descriptor.name]);
    for (const alias of aliases) {
      const normalized = normalizeServiceKey(alias);
      if (!normalized) {
        continue;
      }
      lookup.set(normalized, descriptor);
    }
  }

  cachedRegistry = {
    descriptors,
    lookup,
    indexPath,
    generatedAt: indexJson.generatedAt ?? null,
    baseSpec: indexJson.baseSpec ?? null
  };

  return cachedRegistry;
}

export function getServiceSpecIndex() {
  const { descriptors } = loadRegistry();
  return descriptors.map(({ documentPath, ...publicDescriptor }) => ({ ...publicDescriptor }));
}

function validateSpecAgainstDescriptor(document, descriptor) {
  const openApiVersion = String(document?.openapi ?? '').trim();
  if (!/^3\.\d+\.\d+/u.test(openApiVersion)) {
    throw new Error(
      `OpenAPI document for service '${descriptor.service}' must declare an OpenAPI 3.x version`
    );
  }

  const paths = document?.paths;
  if (!paths || typeof paths !== 'object') {
    throw new Error(
      `OpenAPI document for service '${descriptor.service}' must expose a paths object`
    );
  }

  const invalidPaths = Object.keys(paths).filter(
    (pathKey) => !pathKey.startsWith(descriptor.basePath)
  );

  if (invalidPaths.length > 0) {
    throw new Error(
      `OpenAPI document for service '${descriptor.service}' declares paths outside its base path '${descriptor.basePath}': ${invalidPaths.join(', ')}`
    );
  }
}

function getDescriptorForService(service) {
  if (!service && service !== 0) {
    return null;
  }

  const { lookup } = loadRegistry();
  const normalized = normalizeServiceKey(service);
  return lookup.get(normalized) ?? null;
}

function createCacheKey(descriptor) {
  return `${descriptor.service}@${descriptor.version}`;
}

export function getServiceSpecDocument(service) {
  const descriptor = getDescriptorForService(service);
  if (!descriptor) {
    return null;
  }

  const cacheKey = createCacheKey(descriptor);
  if (!specCache.has(cacheKey)) {
    const document = readJsonFile(descriptor.documentPath, `OpenAPI document for ${descriptor.service}`);
    validateSpecAgainstDescriptor(document, descriptor);
    specCache.set(cacheKey, document);
  }

  return cloneValue(specCache.get(cacheKey));
}

export function clearServiceSpecCache() {
  cachedRegistry = undefined;
  specCache.clear();
}

export default {
  getServiceSpecIndex,
  getServiceSpecDocument,
  clearServiceSpecCache
};
