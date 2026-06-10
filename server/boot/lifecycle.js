import { createLogger } from '../logger.js';
import { getRuntimeMode } from '../middleware/runtimeMode.js';
import { startLogCleanup } from '../logRetention.js';
import { startTaskWorker } from '../taskWorker.js';
import { startSchedulerWorker } from '../schedulerWorker.js';
import { checkDb } from './database.js';
import { tickJulesWatcher } from './julesWatcher.js';
import { attachTerminalServer } from '../terminal/index.js';

const log = createLogger('server-lifecycle');

export async function startServer(app, options = {}) {
  const port = options.port ?? process.env.PORT ?? 3001;
  const shouldStartWorkers = options.startWorkers ?? process.env.NODE_ENV !== 'test';
  const shouldStartWatchers = options.startWatchers ?? shouldStartWorkers;

  await checkDb();

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      log.info('Homebase API server started', {
        url: `http://localhost:${port}`,
        mode: getRuntimeMode(),
      });

      attachTerminalServer(server);

      if (shouldStartWorkers) {
        startLogCleanup();
        startTaskWorker();
        startSchedulerWorker();
      }

      if (shouldStartWatchers) {
        setInterval(tickJulesWatcher, 15_000);
      }

      resolve(server);
    });

    server.on('error', (err) => {
      log.error('Failed to start server', { error: err.message });
      reject(err);
    });
  });
}
