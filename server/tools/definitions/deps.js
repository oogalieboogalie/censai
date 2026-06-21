export const depTools = [
  {
    type: 'function',
    function: {
      name: 'vulnerability_audit',
      description: 'Run a security audit on a project or a specific file. Checks for vulnerable dependencies and security hotspots.',
      parameters: {
        type: 'object',
        properties: {
          file_path: { type: 'string', description: 'Path to the file or package.json to audit.' },
          repo_root: { type: 'string', description: 'Optional: repository root path.' },
        },
        required: ['file_path'],
      },
    },
  },
];
