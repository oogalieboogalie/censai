import express from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execFileAsync = promisify(execFile);
const app = express();
app.use(express.json({ limit: '50mb' }));

const RUNNER_SECRET = process.env.RUNNER_SECRET;
const PORT = process.env.RUNNER_PORT || 3003;

app.use((req, res, next) => {
  if (RUNNER_SECRET && req.headers['x-runner-secret'] !== RUNNER_SECRET) {
    console.warn(`Unauthorized access attempt from ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

app.post('/exec', async (req, res) => {
  const { command, args, options } = req.body;

  const cmdPreview = `${command} ${(args || []).join(' ')}`.slice(0, 100);
  console.log(`[Runner] Executing: ${cmdPreview}`);

  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      maxBuffer: 50 * 1024 * 1024,
      ...options,
      shell: process.platform === 'win32' || options?.shell,
    });
    res.json({ stdout, stderr, code: 0 });
  } catch (err) {
    console.error(`[Runner] Command failed: ${cmdPreview}`, err.message);
    res.json({
      stdout: err.stdout || '',
      stderr: err.stderr || err.message || '',
      code: err.code ?? err.status ?? 1,
    });
  }
});

app.post('/fs/read', async (req, res) => {
  const { path: filePath, encoding = 'utf8' } = req.body;
  console.log(`[Runner] FS Read: ${filePath}`);
  try {
    const content = await fs.promises.readFile(filePath, encoding);
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/fs/write', async (req, res) => {
  const { path: filePath, content, encoding = 'utf8' } = req.body;
  console.log(`[Runner] FS Write: ${filePath}`);
  try {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, content, encoding);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/fs/list', async (req, res) => {
  const { path: dirPath } = req.body;
  console.log(`[Runner] FS List: ${dirPath}`);
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    res.json({
      entries: entries.map(e => ({
        name: e.name,
        isDirectory: e.isDirectory(),
        isFile: e.isFile()
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    version: '0.1.0',
    platform: process.platform,
    arch: process.arch,
    uptime: process.uptime()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Censai Hub Runner Service started on port ${PORT}`);
  if (!RUNNER_SECRET) {
    console.warn('WARNING: RUNNER_SECRET is not set. The runner is unauthenticated.');
  }
});
