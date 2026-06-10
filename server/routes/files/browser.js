import express from 'express';
import fs from 'fs';
import path from 'path';
import { requireLocalFilesystem } from '../../middleware/runtimeMode.js';
import { readCurrentProject, validateProjectPath, getDirectoryTree } from './pathUtils.js';

export const browserRouter = express.Router();

browserRouter.get('/files', requireLocalFilesystem, async (req, res) => {
  const dirPath = req.query.path;
  if (!dirPath) return res.status(400).json({ error: 'Missing path query parameter' });
  try {
    const resolvedPath = await validateProjectPath(dirPath);
    res.json(await getDirectoryTree(resolvedPath));
  } catch (err) {
    res.status(err.message?.startsWith('Access denied') ? 403 : 500).json({ error: err.message });
  }
});

browserRouter.get('/files/search', requireLocalFilesystem, async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Missing query' });
  try {
    const currentProject = await readCurrentProject();
    const root = path.resolve(currentProject?.path || process.cwd());
    const results = [];
    const walk = async (dir) => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.name.toLowerCase().includes(query.toLowerCase())) {
          results.push({ name: entry.name, path: fullPath, relativePath: path.relative(root, fullPath) });
        }
      }
    };
    await walk(root);
    res.json({ results: results.slice(0, 100) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

browserRouter.get('/files/backlinks', requireLocalFilesystem, async (req, res) => {
  const targetPath = req.query.path;
  if (!targetPath) return res.status(400).json({ error: 'Missing path' });
  try {
    const currentProject = await readCurrentProject();
    const root = path.resolve(currentProject?.path || process.cwd());
    const targetName = path.basename(targetPath).replace(/\.md$/, '');
    const results = [];
    const walk = async (dir) => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.name.endsWith('.md') && fullPath !== path.resolve(targetPath)) {
          const content = await fs.promises.readFile(fullPath, 'utf8');
          if (content.includes(`[[${targetName}]]`)) {
            results.push({ name: entry.name, path: fullPath, relativePath: path.relative(root, fullPath) });
          }
        }
      }
    };
    await walk(root);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

browserRouter.get('/files/content', requireLocalFilesystem, async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'Missing path query parameter' });
  try {
    const resolvedPath = await validateProjectPath(filePath);
    const content = await fs.promises.readFile(resolvedPath, 'utf8');
    res.json({ content, path: filePath });
  } catch (err) {
    res.status(err.message?.startsWith('Access denied') ? 403 : 500).json({ error: err.message });
  }
});

browserRouter.put('/files/content', requireLocalFilesystem, async (req, res) => {
  const { path: filePath, content } = req.body;
  if (!filePath || typeof content !== 'string') return res.status(400).json({ error: 'Missing path or content in body' });
  try {
    const resolvedPath = await validateProjectPath(filePath);
    await fs.promises.writeFile(resolvedPath, content, 'utf8');
    res.json({ ok: true, path: filePath });
  } catch (err) {
    res.status(err.message?.startsWith('Access denied') ? 403 : 500).json({ error: err.message });
  }
});

browserRouter.get('/files/browse', requireLocalFilesystem, async (req, res) => {
  const dirPath = req.query.path;
  try {
    const currentProject = await readCurrentProject();
    const resolved = dirPath
      ? await validateProjectPath(dirPath)
      : path.resolve(currentProject?.path || process.cwd());
    const stats = await fs.promises.stat(resolved);
    if (!stats.isDirectory()) return res.status(400).json({ error: 'Not a directory' });
    const entries = await fs.promises.readdir(resolved, { withFileTypes: true });
    const children = entries
      .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== '$Recycle.Bin' && e.name !== 'System Volume Information')
      .map(e => ({ name: e.name, isDir: e.isDirectory(), path: path.join(resolved, e.name) }))
      .sort((a, b) => { if (a.isDir && !b.isDir) return -1; if (!a.isDir && b.isDir) return 1; return a.name.localeCompare(b.name); });
    const parent = path.dirname(resolved);
    res.json({ path: resolved, parent: parent !== resolved ? parent : null, children });
  } catch (err) {
    res.status(err.message?.startsWith('Access denied') ? 403 : 500).json({ error: err.message });
  }
});
