import * as agents from './api/agents.js';
import * as workspace from './api/workspace.js';
import * as files from './api/files.js';
import * as projects from './api/projects.js';
import * as memory from './api/memory.js';
import * as system from './api/system.js';
import * as providers from './api/providers.js';
import * as schedules from './api/schedules.js';
import * as integrations from './api/integrations.js';

export const api = {
  ...agents,
  ...workspace,
  ...files,
  ...projects,
  ...memory,
  ...system,
  ...providers,
  ...schedules,
  ...integrations
};
