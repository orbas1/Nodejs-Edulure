import { Router } from 'express';
import { GraphQLError, Kind } from 'graphql';
import { createHandler } from 'graphql-http/lib/use/express';

import logger from '../config/logger.js';
import { feedSchema } from './schema.js';

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

function normaliseActorRole(role, fallback = 'user') {
  if (typeof role !== 'string') {
    return fallback;
  }

  const normalised = role.trim().toLowerCase();
  if (!normalised.length) {
    return fallback;
  }

  return allowedActorRoles.has(normalised) ? normalised : fallback;
}

function resolveActorFromRequest(req) {
  const userId = coerceActorId(req.user?.id);
  if (userId !== null) {
    return {
      id: userId,
      role: normaliseActorRole(req.user?.role, 'user')
    };
  }

  const headerActorId = req.headers['x-actor-id'];
  const headerId = typeof headerActorId === 'string' ? coerceActorId(headerActorId) : null;
  if (headerId !== null) {
    return {
      id: headerId,
      role: normaliseActorRole(req.headers['x-actor-role'], 'service')
    };
  }

  return null;
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
      req.graphqlPermissions = permissionsByRole[actor.role] ?? permissionsByRole.user;

      return next();
    } catch (error) {
      loggerInstance.warn({ err: error, requestId: req.id }, 'GraphQL actor resolution failed');
      return res.status(400).json({
        data: null,
        errors: [
          {
            message: 'Invalid GraphQL request context',
            extensions: { code: 'BAD_USER_INPUT' }
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
        const resolvedActor = req.graphqlActor ?? resolveActorFromRequest(req);
        const permissions = req.graphqlPermissions ?? permissionsByRole[resolvedActor?.role ?? 'user'] ?? permissionsByRole.user;

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
