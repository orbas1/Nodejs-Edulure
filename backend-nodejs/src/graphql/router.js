import { Router } from 'express';
import { GraphQLError, Kind } from 'graphql';
import { createHandler } from 'graphql-http/lib/use/express';

import logger from '../config/logger.js';
import { feedSchema } from './schema.js';
import persistedQueryStore, { computeSha256 } from './persistedQueryStore.js';

const DEFAULT_MAX_QUERY_DEPTH = 8;
const DEFAULT_MAX_OPERATIONS = 1;

const allowedActorRoles = new Set(['user', 'admin', 'instructor', 'service', 'moderator']);

const permissionsByRole = {
  admin: ['feed:read', 'feed:manage', 'ads:read'],
  instructor: ['feed:read', 'ads:read'],
  moderator: ['feed:read', 'ads:read'],
  service: ['feed:read', 'feed:manage', 'ads:read'],
  user: ['feed:read']
};

function coerceActorId(rawId) {
  if (typeof rawId === 'number' && Number.isFinite(rawId)) {
    return Number.isSafeInteger(rawId) ? rawId : null;
  }

  if (typeof rawId === 'string') {
    const trimmed = rawId.trim();
    if (!trimmed.length) {
      return null;
    }

    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric) && Number.isSafeInteger(numeric)) {
      return numeric;
    }
  }

  return null;
}

function normaliseActorRole(role, fallback) {
  if (role === undefined || role === null) {
    return fallback ?? null;
  }

  if (typeof role !== 'string') {
    return fallback ?? null;
  }

  const normalised = role.trim().toLowerCase();
  if (!normalised.length) {
    return fallback ?? null;
  }

  if (allowedActorRoles.has(normalised)) {
    return normalised;
  }

  return null;
}

class ActorResolutionError extends Error {
  constructor(message, { status = 400, code = 'BAD_USER_INPUT', responseMessage } = {}) {
    super(message);
    this.name = 'ActorResolutionError';
    this.status = status;
    this.code = code;
    this.responseMessage = responseMessage ?? message;
  }
}

function resolveActorFromRequest(req) {
  const userId = coerceActorId(req.user?.id);
  if (userId !== null) {
    const role = normaliseActorRole(req.user?.role, 'user');
    if (role === null) {
      throw new ActorResolutionError('Session role is not permitted for GraphQL access', {
        status: 403,
        code: 'FORBIDDEN',
        responseMessage: 'GraphQL actor role not permitted'
      });
    }

    return {
      id: userId,
      role
    };
  }

  const headerActorId = req.headers['x-actor-id'];
  const headerId = typeof headerActorId === 'string' ? coerceActorId(headerActorId) : null;
  if (headerId !== null) {
    const role = normaliseActorRole(req.headers['x-actor-role'], 'service');
    if (role === null) {
      throw new ActorResolutionError('Header actor role is not permitted for GraphQL access', {
        status: 403,
        code: 'FORBIDDEN',
        responseMessage: 'GraphQL actor role not permitted'
      });
    }

    return {
      id: headerId,
      role
    };
  }

  return null;
}

function normalisePermissions(permissions, fallback = [], { inherit = true } = {}) {
  const base = Array.isArray(fallback) ? fallback : [];
  const provided = Array.isArray(permissions) ? permissions : undefined;
  const unique = new Set();

  const sources = inherit
    ? [...base, ...(provided ?? [])]
    : provided ?? base;

  for (const permission of sources) {
    if (typeof permission !== 'string') {
      continue;
    }
    const normalised = permission.trim();
    if (normalised.length) {
      unique.add(normalised);
    }
  }
  return Array.from(unique);
}

function createOperationLimitRule(maxOperations = DEFAULT_MAX_OPERATIONS) {
  const operationsCap = Math.max(1, maxOperations);
  return (validationContext) => {
    let operationCount = 0;

    return {
      OperationDefinition(node) {
        operationCount += 1;
        if (operationCount > operationsCap) {
          validationContext.reportError(
            new GraphQLError(`Request must not contain more than ${operationsCap} operation(s).`, {
              nodes: [node],
              extensions: {
                code: 'OPERATION_LIMIT_EXCEEDED',
                http: { status: 400 }
              }
            })
          );
        }
      }
    };
  };
}

function createDepthLimitRule(maxDepth = DEFAULT_MAX_QUERY_DEPTH) {
  const depthCap = Math.max(1, maxDepth);
  return (validationContext) => {
    const document = validationContext.getDocument();
    const fragments = Object.create(null);

    for (const definition of document?.definitions ?? []) {
      if (definition.kind === Kind.FRAGMENT_DEFINITION) {
        fragments[definition.name.value] = definition;
      }
    }

    const measureDepth = (node, depthSoFar) => {
      if (!node.selectionSet || !node.selectionSet.selections?.length) {
        return depthSoFar;
      }

      return node.selectionSet.selections.reduce((maxDepthEncountered, selection) => {
        if (selection.kind === Kind.FIELD) {
          if (selection.name.value === '__typename') {
            return Math.max(maxDepthEncountered, depthSoFar);
          }
          return Math.max(maxDepthEncountered, measureDepth(selection, depthSoFar + 1));
        }

        if (selection.kind === Kind.INLINE_FRAGMENT) {
          return Math.max(maxDepthEncountered, measureDepth(selection, depthSoFar));
        }

        if (selection.kind === Kind.FRAGMENT_SPREAD) {
          const fragment = fragments[selection.name.value];
          if (!fragment) {
            return maxDepthEncountered;
          }
          return Math.max(maxDepthEncountered, measureDepth(fragment, depthSoFar));
        }

        return maxDepthEncountered;
      }, depthSoFar);
    };

    return {
      OperationDefinition(node) {
        const depth = measureDepth(node, 0);
        if (depth > depthCap) {
          validationContext.reportError(
            new GraphQLError(`Query exceeds the maximum depth of ${depthCap}.`, {
              nodes: [node],
              extensions: {
                code: 'DEPTH_LIMIT_EXCEEDED',
                http: { status: 400 }
              }
            })
          );
        }
      }
    };
  };
}

function createIntrospectionRestrictionRule({ allowInProduction = false } = {}) {
  if (allowInProduction || process.env.NODE_ENV !== 'production') {
    return null;
  }

  return (validationContext) => ({
    Field(node) {
      if (node.name.value === '__schema' || node.name.value === '__type') {
        validationContext.reportError(
          new GraphQLError('Introspection is disabled in production.', {
            nodes: [node],
            extensions: {
              code: 'INTROSPECTION_DISABLED',
              http: { status: 403 }
            }
          })
        );
      }
    }
  });
}

export function createGraphQLRouter({ schema = feedSchema, loggerInstance = logger } = {}) {
  const router = Router();

  router.use((req, res, next) => {
    if (!req.body) {
      return next();
    }

    const normaliseOperations = (operations) => {
      const items = Array.isArray(operations) ? operations : [operations];
      const transformed = [];

      for (const operation of items) {
        if (!operation || typeof operation !== 'object') {
          transformed.push(operation);
          continue;
        }

        const persistedQueryExtensions = operation.extensions?.persistedQuery;
        if (!persistedQueryExtensions) {
          transformed.push(operation);
          continue;
        }

        const { sha256Hash, version } = persistedQueryExtensions;
        if (!sha256Hash) {
          res.status(400).json({
            data: null,
            errors: [
              {
                message: 'Persisted query hash is required when using persistedQuery extensions.',
                extensions: { code: 'PERSISTED_QUERY_HASH_MISSING' }
              }
            ]
          });
          return null;
        }

        if (version && Number(version) !== 1) {
          res.status(400).json({
            data: null,
            errors: [
              {
                message: 'Unsupported persisted query version. Only version 1 is supported.',
                extensions: { code: 'PERSISTED_QUERY_VERSION_UNSUPPORTED', version }
              }
            ]
          });
          return null;
        }

        if (operation.query) {
          const trimmedQuery = String(operation.query).trim();
          if (!trimmedQuery) {
            res.status(400).json({
              data: null,
              errors: [
                {
                  message: 'Persisted query text must not be empty.',
                  extensions: { code: 'PERSISTED_QUERY_EMPTY' }
                }
              ]
            });
            return null;
          }

          const computedHash = computeSha256(trimmedQuery);
          if (computedHash !== sha256Hash.toLowerCase()) {
            res.status(400).json({
              data: null,
              errors: [
                {
                  message: 'Persisted query hash does not match provided query.',
                  extensions: { code: 'PERSISTED_QUERY_HASH_MISMATCH' }
                }
              ]
            });
            return null;
          }

          persistedQueryStore.set(sha256Hash, trimmedQuery);
          transformed.push({ ...operation, query: trimmedQuery });
          continue;
        }

        const storedQuery = persistedQueryStore.get(sha256Hash);
        if (!storedQuery) {
          res.status(404).json({
            data: null,
            errors: [
              {
                message: 'Persisted query not found. Submit the full query text to register it first.',
                extensions: { code: 'PERSISTED_QUERY_NOT_FOUND', sha256Hash }
              }
            ]
          });
          return null;
        }

        transformed.push({ ...operation, query: storedQuery });
      }

      return Array.isArray(operations) ? transformed : transformed[0];
    };

    const nextBody = normaliseOperations(req.body);
    if (nextBody === null) {
      return undefined;
    }

    req.body = nextBody;
    return next();
  });

  const validationRules = [
    createOperationLimitRule(),
    createDepthLimitRule()
  ];

  const introspectionRule = createIntrospectionRestrictionRule();
  if (introspectionRule) {
    validationRules.push(introspectionRule);
  }

  router.use((req, res, next) => {
    try {
      const actor = resolveActorFromRequest(req);
      if (!actor) {
        return res.status(401).json({
          data: null,
          errors: [
            {
              message: 'Unauthorised GraphQL request',
              extensions: { code: 'UNAUTHENTICATED' }
            }
          ]
        });
      }

      req.graphqlActor = actor;
      const inheritRolePermissions = req.user?.inheritRolePermissions !== false;

      req.graphqlPermissions = normalisePermissions(
        req.user?.permissions,
        permissionsByRole[actor.role] ?? permissionsByRole.user ?? [],
        { inherit: inheritRolePermissions }
      );

      if (req.raw) {
        req.raw.graphqlActor = actor;
        req.raw.graphqlPermissions = req.graphqlPermissions;
        if (req.raw.user === undefined && req.user) {
          req.raw.user = req.user;
        }
      }

      return next();
    } catch (error) {
      const status = error.status ?? 400;
      const code = error.code ?? 'BAD_USER_INPUT';
      const message = error.responseMessage ?? 'Invalid GraphQL request context';

      loggerInstance.warn({ err: error, requestId: req.id }, 'GraphQL actor resolution failed');
      return res.status(status).json({
        data: null,
        errors: [
          {
            message,
            extensions: { code }
          }
        ]
      });
    }
  });

  router.use(
    createHandler({
      schema,
      validationRules,
      context: async (req) => {
        const resolvedActor = req.graphqlActor ?? req.raw?.graphqlActor ?? resolveActorFromRequest(req);

        const permissionSourceUser = req.user ?? req.raw?.user ?? null;
        const inheritRolePermissions = permissionSourceUser?.inheritRolePermissions !== false;

        const permissions = (req.graphqlPermissions ?? req.raw?.graphqlPermissions)
          ?? normalisePermissions(
            permissionSourceUser?.permissions,
            permissionsByRole[resolvedActor?.role ?? 'user'] ?? permissionsByRole.user ?? [],
            { inherit: inheritRolePermissions }
          );

        return {
          actor: resolvedActor,
          requestId: req.id,
          logger: loggerInstance.child({ component: 'graphql', requestId: req.id }),
          ip: req.ip,
          origin: req.headers.origin ?? null,
          userAgent: req.headers['user-agent'] ?? null,
          permissions
        };
      },
      formatError: (error) => {
        loggerInstance.error({ err: error }, 'GraphQL execution error');
        return {
          message: error.message,
          locations: error.locations,
          path: error.path,
          extensions: error.extensions
        };
      },
      graphiql: false
    })
  );

  return router;
}

export default createGraphQLRouter;
