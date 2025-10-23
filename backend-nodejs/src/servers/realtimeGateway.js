import { env } from '../config/env.js';
import realtimeService from '../services/RealtimeService.js';

export async function attachRealtimeGateway({ httpServer, readiness, logger }) {
  if (!httpServer) {
    throw new Error('attachRealtimeGateway requires an httpServer instance');
  }

  const realtimeLogger = logger.child({ scope: 'realtime' });

  readiness.markPending('socket-gateway', 'Initialising realtime gateway');
  try {
    await realtimeService.start(httpServer);
    realtimeLogger.info('[realtime] Gateway initialised');
  } catch (error) {
    readiness.markFailed('socket-gateway', error);
    realtimeLogger.error({ err: error }, '[realtime] Failed to start gateway');
    throw error;
  }

  let stopped = false;

  return {
    markListening(port = env.services.realtime.port) {
      if (stopped) {
        return;
      }
      readiness.markReady('socket-gateway', `Listening on port ${port}`);
      realtimeLogger.info({ port }, '[realtime] Gateway listening');
    },
    async stop(reason = 'manual') {
      if (stopped) {
        return;
      }
      stopped = true;
      readiness.markPending('socket-gateway', `Shutting down (${reason})`);
      await Promise.resolve(realtimeService.stop()).catch((error) => {
        realtimeLogger.error({ err: error }, '[realtime] Error stopping gateway');
      });
      readiness.markDegraded('socket-gateway', 'Realtime gateway stopped');
    }
  };
}

export default attachRealtimeGateway;
