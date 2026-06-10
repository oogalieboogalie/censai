import { sovereignTestRouter } from '../sovereignTest.js';
import { calendarRouter } from '../calendar.js';
import { sheetsRouter } from '../sheets.js';
import { youtubeRouter } from '../youtube.js';
import { authRouter } from '../routes/auth.js';
import { filesRouter } from '../routes/files/index.js';
import { projectsRouter } from '../routes/projects/index.js';
import { githubRouter } from '../routes/github/index.js';
import { chatRouter } from '../routes/chat/index.js';
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
import { getSystemStatus } from '../health.js';
import { runnerClient } from '../runner/client.js';

export function mountRouters(app) {
  app.use('/api/sovereignTest', sovereignTestRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/sheets', sheetsRouter);
  app.use('/api/youtube', youtubeRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/github', githubRouter);
  app.use('/api', projectsRouter);
  app.use('/api', filesRouter);
  app.use('/api', chatRouter);
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
