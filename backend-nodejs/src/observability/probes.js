import express from 'express';

export function createProbeApp({ service, readinessCheck, livenessCheck }) {
  if (typeof readinessCheck !== 'function') {
    throw new Error('createProbeApp requires a readinessCheck function.');
  }

  const app = express();
  const serviceName = service ?? 'service';

  app.get('/live', async (_req, res) => {
    try {
      const result = livenessCheck ? await Promise.resolve(livenessCheck()) : { alive: true };
      const alive = result?.alive !== false;
      const payload = {
        service: serviceName,
        alive,
        status: alive ? 'alive' : 'down',
        checkedAt: new Date().toISOString(),
        ...(result && typeof result === 'object' ? result : {})
      };
      res.status(alive ? 200 : 500).json(payload);
    } catch (error) {
      res.status(500).json({
        service: serviceName,
        alive: false,
        status: 'down',
        checkedAt: new Date().toISOString(),
        error: error.message ?? String(error)
      });
    }
  });

  app.get('/ready', async (_req, res) => {
    try {
      const report = await Promise.resolve(readinessCheck());
      const ready = Boolean(report?.ready);
      const payload = {
        service: serviceName,
        ready,
        status: ready ? 'ready' : 'not_ready',
        checkedAt: new Date().toISOString(),
        ...(report && typeof report === 'object' ? report : {})
      };
      res.status(ready ? 200 : 503).json(payload);
    } catch (error) {
      res.status(503).json({
        service: serviceName,
        ready: false,
        status: 'not_ready',
        checkedAt: new Date().toISOString(),
        error: error.message ?? String(error)
      });
    }
  });

  return app;
}
