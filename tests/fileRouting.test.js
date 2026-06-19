import {
  fileLanguage,
  fileWindowKind,
  fileWindowProps,
  isCodeLikeFile,
  isDocLikeFile,
} from '../src/components/files/fileRouting.js';

describe('file browser window routing', () => {
  test.each([
    'app.js',
    'AppContent.jsx',
    'types.ts',
    'view.tsx',
    'package.json',
    'style.css',
    'index.html',
    'server.mjs',
    'config.cjs',
    'docker-compose.yml',
    'vite.config.js',
    'Dockerfile',
    '.env.example',
  ])('routes source/config file %s to the code editor', (name) => {
    expect(isCodeLikeFile(name)).toBe(true);
    expect(fileWindowKind(name)).toBe('code_editor');
  });

  test.each([
    'README.md',
    'notes.markdown',
    'brief.mdx',
    'handoff.txt',
    'guide.rst',
  ])('keeps document file %s on the doc path', (name) => {
    expect(isDocLikeFile(name)).toBe(true);
    expect(fileWindowKind(name)).toBe('doc');
  });

  test('builds code editor props without dropping GitHub context', () => {
    expect(fileWindowProps({ name: 'App.jsx', path: 'src/App.jsx' }, 'owner/repo')).toEqual({
      title: 'App.jsx',
      fileName: 'App.jsx',
      filePath: 'src/App.jsx',
      isGithub: true,
      githubRepo: 'owner/repo',
      language: 'jsx',
    });
  });

  test('normalizes common language labels', () => {
    expect(fileLanguage('docker-compose.yml')).toBe('yaml');
    expect(fileLanguage('index.htm')).toBe('html');
  });
});
