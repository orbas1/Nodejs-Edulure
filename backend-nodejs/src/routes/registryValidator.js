import { z } from 'zod';

import logger from '../config/logger.js';

const routeDescriptorSchema = z
  .object({
    name: z.string().trim().min(1, 'Route name is required.'),
    capability: z.string().trim().min(1, 'Route capability is required.'),
    basePath: z
      .string()
      .trim()
      .min(1, 'Route base path is required.')
      .refine((value) => value.startsWith('/'), {
        message: 'Route base path must start with a forward slash (/).'
      }),
    flagKey: z.string().trim().min(1, 'Feature flag key is required.'),
    defaultState: z.enum(['enabled', 'disabled']).optional(),
    fallbackStatus: z
      .number({ invalid_type_error: 'Fallback status must be an HTTP status code.' })
      .int('Fallback status must be an integer HTTP status code.')
      .min(100)
      .max(599)
      .optional(),
    disabledMessage: z.string().optional(),
    audience: z.string().optional(),
    description: z.string().optional()
  })
  .passthrough();

function looksLikeExpressRouter(router) {
  return Boolean(router) && typeof router.use === 'function' && typeof router.handle === 'function';
}

function normaliseBasePath(pathValue) {
  if (pathValue === '/') {
    return pathValue;
  }

  const trimmed = pathValue.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export function buildRouteRegistry({ metadata, routers, loggerInstance = logger } = {}) {
  if (!Array.isArray(metadata) || metadata.length === 0) {
    throw new Error('Route metadata must be provided as a non-empty array.');
  }

  if (!routers || typeof routers !== 'object') {
    throw new Error('Router map must be provided when building the route registry.');
  }

  const errors = [];
  const seenNames = new Set();
  const seenPaths = new Set();
  const registry = [];

  for (const rawDescriptor of metadata) {
    const result = routeDescriptorSchema.safeParse(rawDescriptor);
    if (!result.success) {
      errors.push(
        `Route descriptor for \`${rawDescriptor?.name ?? '<unknown>'}\` is invalid: ${result.error.issues
          .map((issue) => issue.message)
          .join('; ')}`
      );
      continue;
    }

    const descriptor = result.data;
    descriptor.basePath = normaliseBasePath(descriptor.basePath);
    descriptor.defaultState = descriptor.defaultState ?? 'disabled';

    if (seenNames.has(descriptor.name)) {
      errors.push(`Duplicate route name detected: \`${descriptor.name}\`.`);
    } else {
      seenNames.add(descriptor.name);
    }

    if (seenPaths.has(descriptor.basePath)) {
      errors.push(`Duplicate base path detected: \`${descriptor.basePath}\`.`);
    } else {
      seenPaths.add(descriptor.basePath);
    }

    const router = routers[descriptor.name];
    if (!router) {
      errors.push(`No router was provided for route \`${descriptor.name}\`.`);
      continue;
    }

    if (!looksLikeExpressRouter(router)) {
      errors.push(`Router for \`${descriptor.name}\` does not expose the expected Express interface.`);
      continue;
    }

    registry.push({
      ...descriptor,
      router
    });
  }

  if (errors.length > 0) {
    loggerInstance.error({ errors }, 'Invalid API route registry configuration detected');
    throw new AggregateError(
      errors.map((message) => new Error(message)),
      'Invalid API route registry configuration'
    );
  }

  loggerInstance.debug({ routeCount: registry.length }, 'API route registry validated successfully');
  return registry;
}

export function describeRouteRegistry(registry) {
  return registry.map(({ name, basePath, path, capability, audience }) => ({
    name,
    basePath: basePath ?? path,
    path: path ?? basePath,
    capability,
    audience: audience ?? 'public'
  }));
}

export default buildRouteRegistry;
