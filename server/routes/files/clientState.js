import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const clientStateRouter = express.Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_STATE_DIR = path.resolve(path.join(__dirname, '..', '..', '..', '.homebase-state'));
const CLIENT_STATE_DIR = LOCAL_STATE_DIR;
const CLIENT_STATE_KEYS = new Map([
  ['homebase.workspace.v1', 'workspace.json'],
  ['homebase.presets.v1', 'presets.json'],
  ['homebase.theme.customPresets.v1', 'theme-custom-presets.json'],
  ['homebase.journals.v1', 'journals.json'],
  ['homebase.scheduler.v1', 'schedules.json'],
]);

function clientStatePath(key) {
  const file = CLIENT_STATE_KEYS.get(key);
  return file ? path.join(CLIENT_STATE_DIR, file) : null;
}

clientStateRouter.get('/client-state/:key', async (req, res) => {
  const filePath = clientStatePath(req.params.key);
  if (!filePath) return res.status(404).json({ error: 'Unknown state key' });

  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    res.json({ value: JSON.parse(raw) });
  } catch (err) {
    if (err.code === 'ENOENT') return res.status(404).json({ value: null });
    res.status(500).json({ error: err.message });
  }
});

clientStateRouter.put('/client-state/:key', async (req, res) => {
  const filePath = clientStatePath(req.params.key);
  if (!filePath) return res.status(404).json({ error: 'Unknown state key' });

  try {
    await fs.promises.mkdir(CLIENT_STATE_DIR, { recursive: true });
    const nextValue = req.body?.value ?? null;
    if (req.params.key === 'homebase.presets.v1' && Array.isArray(nextValue) && nextValue.length === 0) {
      if (req.body?.allowEmpty !== true) {
        return res.status(409).json({
          error: 'Refusing to save an empty preset list without allowEmpty=true',
        });
      }
      try {
        const existingRaw = await fs.promises.readFile(filePath, 'utf8');
        const existingValue = JSON.parse(existingRaw);
        if (Array.isArray(existingValue) && existingValue.length > 0) {
          const stamp = new Date().toISOString().replace(/[:.]/g, '-');
          await fs.promises.writeFile(`${filePath}.${stamp}.bak`, existingRaw, 'utf8');
        }
      } catch (err) {
        if (err.code !== 'ENOENT') console.warn('Failed to back up presets before empty overwrite:', err.message);
      }
    }
    const tmpPath = `${filePath}.tmp`;
    await fs.promises.writeFile(tmpPath, JSON.stringify(nextValue, null, 2), 'utf8');
    await fs.promises.rename(tmpPath, filePath);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

clientStateRouter.delete('/client-state/:key', async (req, res) => {
  const filePath = clientStatePath(req.params.key);
  if (!filePath) return res.status(404).json({ error: 'Unknown state key' });

  try {
    await fs.promises.rm(filePath, { force: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
