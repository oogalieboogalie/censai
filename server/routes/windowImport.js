/**
 * Window Import Route
 *
 * POST /api/windows/import
 *   Accepts raw JSX + CSS (e.g. from AI Studio), adapts it via LLM to
 *   match CensaiHub window conventions, writes the folder, and runs
 *   window:sync so it appears on the canvas immediately.
 *
 * POST /api/windows/sync
 *   Just runs window:sync and returns the result (used by UI to refresh).
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { createLogger } from '../logger.js';
import { callModel } from '../aiGateway/callModel.js';

const execFileAsync = promisify(execFile);
const log = createLogger('window-import');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const WINDOWS_DIR = path.join(PROJECT_ROOT, 'src', 'components', 'windows');

export const windowImportRouter = express.Router();

// ── Helpers ────────────────────────────────────────────────────────────────

function slugify(str) {
  return str
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^./, c => c.toLowerCase());
}

function pascalCase(str) {
  const s = slugify(str);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function runSync() {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      ['scripts/window-sync.mjs'],
      { cwd: PROJECT_ROOT, timeout: 30_000 }
    );
    return { ok: true, output: stdout + stderr };
  } catch (err) {
    return { ok: false, output: err.stdout + err.stderr + err.message };
  }
}

// ── The CensaiHub window conventions prompt ────────────────────────────────

function buildAdaptPrompt(rawJsx, rawCss, hint) {
  return `You are a code transformer. Take raw React code (possibly exported from AI Studio or another tool) and adapt it to fit CensaiHub's window component conventions EXACTLY.

CENSAIHUB WINDOW CONVENTIONS:
1. File is named <Name>Window.jsx — component must be: export function <Name>Window() {}
2. Also add: export default <Name>Window; at the bottom
3. CSS goes in a companion file imported as: import './<Name>Window.css';
4. ONLY use these CSS variables — replace ALL hardcoded colors:
   - var(--surface)  → window background
   - var(--ink)      → primary text  
   - var(--accent)   → brand color (buttons, highlights)
   - var(--accent-soft) → subtle borders/dividers
   - color-mix(in srgb, var(--ink) 50%, transparent) → muted text
5. NO Tailwind. Vanilla CSS only.
6. Remove: main.tsx, App.tsx wrapper, ReactDOM.createRoot, index.html boilerplate
7. Remove: import React from 'react' (modern JSX transform)
8. The window fills height: 100% with internal scrolling — no fixed px heights on the root
9. NO routing (no react-router)
10. API calls use fetch('/api/...') — same origin Express backend

${hint ? `USER HINT: ${hint}` : ''}

RAW JSX TO ADAPT:
\`\`\`jsx
${rawJsx}
\`\`\`

${rawCss ? `RAW CSS TO ADAPT:\n\`\`\`css\n${rawCss}\n\`\`\`` : ''}

Respond with EXACTLY this JSON structure (no markdown, raw JSON only):
{
  "kind": "camelCaseKind",
  "label": "Human Readable Label",
  "jsx": "...complete adapted JSX file content...",
  "css": "...complete adapted CSS file content...",
  "defaultSize": { "w": 520, "h": 480 }
}`;
}

// ── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/windows/import
 * Body: { rawJsx, rawCss?, hint?, kind?, label?, defaultSize?, launcher? }
 *
 * Steps:
 * 1. Call LLM to adapt the raw code
 * 2. Write files to src/components/windows/<kind>/
 * 3. Run window:sync
 * 4. Return { ok, kind, label, syncOutput }
 */
windowImportRouter.post('/windows/import', async (req, res) => {
  const { rawJsx, rawCss = '', hint = '', launcher } = req.body;

  if (!rawJsx || rawJsx.trim().length < 20) {
    return res.status(400).json({ error: 'rawJsx is required and must contain actual code.' });
  }

  try {
    // ── Step 1: LLM adaptation via AI gateway ─────────────────────────────
    log.info('adapting window code via LLM');
    const prompt = buildAdaptPrompt(rawJsx, rawCss, hint);

    const aiResponse = await callModel({
      body: {
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      },
      logContext: { route: 'window-import' },
    });

    const rawContent = aiResponse.choices?.[0]?.message?.content || '';

    // Parse JSON from LLM response (strip any accidental markdown fences)
    let adapted;
    try {
      const jsonStr = rawContent.replace(/^```(?:json)?\n?/m, '').replace(/```\s*$/m, '').trim();
      adapted = JSON.parse(jsonStr);
    } catch {
      log.error('LLM returned non-JSON', { rawContent: rawContent.slice(0, 500) });
      return res.status(502).json({
        error: 'LLM did not return valid JSON. Try again or simplify the input.',
        rawLlmOutput: rawContent.slice(0, 1000),
      });
    }

    const kind  = slugify(adapted.kind  || 'importedWindow');
    const label = adapted.label || kind;
    const size  = adapted.defaultSize || { w: 520, h: 480 };
    const jsx   = adapted.jsx || '';
    const css   = adapted.css || '';

    if (!jsx) {
      return res.status(502).json({ error: 'LLM returned empty JSX. Try again.' });
    }

    // ── Step 2: Write files ────────────────────────────────────────────────
    const windowDir = path.join(WINDOWS_DIR, kind);
    fs.mkdirSync(windowDir, { recursive: true });

    const componentName = `${pascalCase(kind)}Window`;
    const cssFile = `${componentName}.css`;

    // Ensure the JSX imports the right CSS file name
    const finalJsx = jsx.replace(
      /import\s+['"][^'"]*\.css['"]/,
      `import './${cssFile}'`
    );

    fs.writeFileSync(path.join(windowDir, 'index.jsx'), finalJsx, 'utf8');
    if (css) {
      fs.writeFileSync(path.join(windowDir, cssFile), css, 'utf8');
    }

    // Write meta.js so window:sync picks it up
    const launcherBlock = launcher
      ? `,\n  launcher: ${JSON.stringify(launcher)}`
      : '';
    const metaJs = `export const windowMeta = {
  kind: '${kind}',
  label: '${label}',
  componentName: '${componentName}',
  componentPath: 'src/components/windows/${kind}/index.jsx',
  defaultSize: { w: ${size.w}, h: ${size.h} }${launcherBlock},
};\n`;
    fs.writeFileSync(path.join(windowDir, 'meta.js'), metaJs, 'utf8');

    log.info('window files written', { kind, componentName, dir: windowDir });

    // ── Step 3: window:sync ────────────────────────────────────────────────
    const syncResult = await runSync();
    log.info('window:sync result', syncResult);

    res.json({
      ok: true,
      kind,
      label,
      componentName,
      syncOk: syncResult.ok,
      syncOutput: syncResult.output,
      message: syncResult.ok
        ? `✓ "${label}" imported and synced. Refresh or open it from the canvas launcher.`
        : `Files written but sync had issues: ${syncResult.output}`,
    });
  } catch (err) {
    log.error('window import failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/windows/sync
 * Runs window:sync manually (e.g. after a manual folder drop).
 */
windowImportRouter.post('/windows/sync', async (_req, res) => {
  const result = await runSync();
  res.json(result);
});

/**
 * GET /api/windows/list-importable
 * Returns folder windows that have a meta.js but may not be synced yet.
 */
windowImportRouter.get('/windows/list-importable', (_req, res) => {
  try {
    if (!fs.existsSync(WINDOWS_DIR)) return res.json({ windows: [] });
    const dirs = fs.readdirSync(WINDOWS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory() && fs.existsSync(path.join(WINDOWS_DIR, d.name, 'meta.js')))
      .map(d => ({ kind: d.name, hasCss: fs.existsSync(path.join(WINDOWS_DIR, d.name, `${pascalCase(d.name)}Window.css`)) }));
    res.json({ windows: dirs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
