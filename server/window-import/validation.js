const FORBIDDEN_PATTERNS = [
  { code: 'child_process', pattern: /\bchild_process\b/ },
  { code: 'fs', pattern: /\bfs\b/ },
  { code: 'eval', pattern: /\beval\s*\(/ },
  { code: 'new-function', pattern: /\bnew\s+Function\b/ },
  { code: 'import-http', pattern: /import\s*\(\s*['"]https?:/ },
];

export function slugifyWindowKind(value) {
  return String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^./, char => char.toLowerCase());
}

export function windowComponentName(value) {
  const slug = slugifyWindowKind(value || 'Imported Window');
  const name = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'ImportedWindow';
  return `${name}Window`;
}

export function validateGeneratedWindow({ kind, label, rawJsx, rawCss }) {
  const suggestedKind = slugifyWindowKind(kind || label || 'Imported Window');
  const combined = [rawJsx || '', rawCss || ''].join('\n');
  const issues = FORBIDDEN_PATTERNS
    .filter(entry => entry.pattern.test(combined))
    .map(entry => ({
      code: entry.code,
      message: `Generated code contains blocked pattern: ${entry.code}`,
    }));

  return {
    ok: issues.length === 0,
    suggestedKind,
    componentName: windowComponentName(suggestedKind),
    issues,
  };
}
