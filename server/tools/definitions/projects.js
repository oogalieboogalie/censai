import { gitTools } from './git.js';
import { localTools } from './local.js';
import { subagentTools } from './subagents.js';
import { julesTools } from './jules.js';
import { coreProjectTools } from './projects-core.js';

export const projectTools = [
  ...gitTools,
  ...localTools,
  ...subagentTools,
  ...julesTools,
  ...coreProjectTools,
  {
    type: 'function',
    function: {
      name: 'vulnerability_audit',
      description: 'Audit project dependencies for known vulnerabilities (CVEs) using the OSV database. Can scan a project root (package.json) or a specific list of dependencies.',
      parameters: {
        type: 'object',
        properties: {
          project: { type: 'string', description: 'Project name' },
          dependencies: { type: 'object', description: 'Optional: Map of package names to versions to audit directly.' },
          ecosystem: { type: 'string', description: 'Optional: Ecosystem (default: npm).' },
        },
      },
    },
  },
];
