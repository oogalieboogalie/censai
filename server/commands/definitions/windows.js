const FORBIDDEN_PATTERNS = [
  { code: 'child_process', pattern: /\bchild_process\b/ },
  { code: 'fs', pattern: /\bfs\b/ },
  { code: 'eval', pattern: /\beval\s*\(/ },
  { code: 'new-function', pattern: /\bnew\s+Function\b/ },
  { code: 'import-http', pattern: /import\s*\(\s*['"]https?:/ },
];

function slugify(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^./, char => char.toLowerCase());
}

function pascalCase(value) {
  const slug = slugify(value || 'Imported Window');
  return slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'ImportedWindow';
}

export const windowCommands = [
  {
    id: 'window.import.validate',
    title: 'Validate generated window import',
    description: 'Scans generated JSX/CSS for blocked APIs before any source-writing route runs.',
    inputSchema: {
      type: 'object',
      required: ['rawJsx'],
      properties: {
        kind: { type: 'string' },
        label: { type: 'string' },
        rawJsx: { type: 'string' },
        rawCss: { type: 'string' },
      },
    },
    outputSchema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
        suggestedKind: { type: 'string' },
        componentName: { type: 'string' },
        issues: { type: 'array' },
      },
    },
    requiredCapabilities: ['window.import'],
    sideEffects: [],
    async handler({ input, context }) {
      const suggestedKind = slugify(input.kind || input.label || 'Imported Window');
      const componentName = `${pascalCase(suggestedKind)}Window`;
      const combined = [input.rawJsx || '', input.rawCss || ''].join('\n');
      const issues = FORBIDDEN_PATTERNS
        .filter(entry => entry.pattern.test(combined))
        .map(entry => ({
          code: entry.code,
          message: `Generated code contains blocked pattern: ${entry.code}`,
        }));
      return {
        ok: issues.length === 0,
        suggestedKind,
        componentName,
        issues,
        runtimeMode: context.runtimeMode,
      };
    },
  },
];
