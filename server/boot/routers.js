import { sovereignTestRouter } from '../sovereignTest.js';
import { calendarRouter } from '../calendar.js';
import { sheetsRouter } from '../sheets.js';
import { youtubeRouter } from '../youtube.js';
import { contextRouter } from '../routes/context.js';
import { authRouter } from '../routes/auth.js';
import { filesRouter } from '../routes/files/index.js';
import { projectsRouter } from '../routes/projects/index.js';
import { githubRouter } from '../routes/github/index.js';
import { chatRouter } from '../routes/chat/index.js';
import { imagesRouter } from '../routes/images/index.js';
import { agentsRouter } from '../routes/agents/index.js';
import { localDevRouter } from '../routes/localDev.js';
import { mailcowRouter } from '../routes/mailcow.js';
import { providersRouter } from '../routes/providers.js';
import { windowSdkRouter } from '../routes/windowSdk.js';
import { julesRouter } from '../routes/jules.js';
import { schedulesRouter } from '../routes/schedules.js';
import { overseerRouter } from '../routes/overseer.js';
import { vexRouter } from '../routes/vex/index.js';
import { containersRouter } from '../routes/containers.js';
import { automationRouter } from '../routes/automation.js';
import { kubernetesRouter } from '../routes/kubernetes.js';
import { sandboxRouter } from '../routes/sandbox.js';
import { windowImportRouter } from '../routes/windowImport.js';
import { operationalIntelligenceRouter } from '../routes/operationalIntelligence.js';
import { commandsRouter } from '../routes/commands.js';
import { keysRouter } from '../routes/keys.js';
import { getSystemStatus } from '../health.js';
import { runnerClient } from '../runner/client.js';
import {
  requireFeatureFlag,
  requireLocalFilesystem,
} from '../middleware/runtimeMode.js';

export function mountRouters(app) {
  app.use('/api/auth', authRouter);

  // Authentication guard for all other API endpoints
  app.use('/api', (req, res, next) => {
    if (req.path === '/health' || req.path === '/ready') {
      return next();
    }
    // Bypass authentication in test environment and provide a mock session
    if (process.env.NODE_ENV === 'test') {
      req.session = req.session || {};
      req.session.userId = req.session.userId || 1;
      return next();
    }
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
    }
    next();
  });

  app.use('/api/sovereignTest', sovereignTestRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/sheets', sheetsRouter);
  app.use('/api/youtube', youtubeRouter);
  app.use('/api', contextRouter);
  app.use('/api/github', githubRouter);
  app.use('/api', projectsRouter);
  app.use('/api', filesRouter);
  app.use('/api', keysRouter);
  app.use('/api', chatRouter);
  app.use('/api/images', imagesRouter);
  app.use('/api', agentsRouter);
  app.use('/api', localDevRouter);
  app.use('/api/mailcow', mailcowRouter);
  app.use('/api/providers', providersRouter);
  app.use('/api', windowSdkRouter);
  app.use('/api', julesRouter);
  app.use('/api', schedulesRouter);
  app.use('/api', overseerRouter);
  app.use('/api/vex', vexRouter);
  app.use('/api', containersRouter);
  app.use('/api', kubernetesRouter);
  app.use('/api/automation', automationRouter);
  app.use('/api', sandboxRouter);
  app.use(
    '/api/windows',
    requireLocalFilesystem,
    requireFeatureFlag('window-import')
  );
  app.use('/api', windowImportRouter);
  app.use('/api', commandsRouter);
  app.use('/api/operational-intelligence', operationalIntelligenceRouter);

  app.get('/api/health', async (_req, res) => {
    const status = await getSystemStatus();
    const runnerStatus = await runnerClient.getHealth();
    res.json({
      ...status,
      hasKey: status.modelProvider.hasKey,
      provider: status.modelProvider.baseUrl,
      model: status.modelProvider.model,
      database: status.database.connected,
      databaseStatus: {
        ready: status.database.connected,
        degraded: !status.database.connected,
        degradedReason: status.degradedState,
        error: status.database.error,
      },
      runner: runnerStatus,
    });
  });

  app.get('/api/ready', async (_req, res) => {
    const status = await getSystemStatus();
    res.status(status.ready ? 200 : 503).json(status);
  });
}
