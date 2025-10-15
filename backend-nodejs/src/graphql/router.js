import { Router } from 'express';
import { createHandler } from 'graphql-http/lib/use/express';

import logger from '../config/logger.js';
import { feedSchema } from './schema.js';

export function createGraphQLRouter({ schema = feedSchema, loggerInstance = logger } = {}) {
  const router = Router();

  router.use(
    createHandler({
      schema,
      context: async (req) => {
        const headerActorId = req.headers['x-actor-id'];
        const resolvedActor =
          req.user && req.user.id
            ? { id: req.user.id, role: req.user.role ?? 'user' }
            : headerActorId
              ? {
                  id: Number.isNaN(Number(headerActorId)) ? headerActorId : Number(headerActorId),
                  role: req.headers['x-actor-role'] ?? 'service'
                }
              : null;

        return {
          actor: resolvedActor,
          requestId: req.id,
          logger: loggerInstance.child({ component: 'graphql', requestId: req.id })
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
