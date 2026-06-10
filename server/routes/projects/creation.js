import fs from 'fs';
import path from 'path';
import { createAgentTask } from '../../memory/tasks.js';
import { getSubAgents } from '../../memory/subagents.js';
import { 
  readCurrentProject, slugify, escapeMd, 
  findExistingHandoffBySourceId, inferProjectName 
} from './shared.js';
import { chooseHandoffSubAgent } from './scoring.js';

export async function createProjectHandoff(req, res) {
  const { title, text, assignee, sourceTitle, priority = 'normal', sourceId } = req.body || {};
  const currentProject = await readCurrentProject();

  if (!currentProject?.path) {
    return res.status(400).json({ error: 'Open a local project before handing off work.' });
  }

  const cleanTitle = String(title || text || '').trim();
  const cleanText = String(text || title || '').trim();
  const cleanSourceId = String(sourceId || '').trim().slice(0, 200);
  if (!cleanTitle || !cleanText) {
    return res.status(400).json({ error: 'Todo handoff needs a title or text.' });
  }

  try {
    const handedOffAt = new Date();
    const handoffDir = path.join(currentProject.path, '.team', 'handoffs');
    await fs.promises.mkdir(handoffDir, { recursive: true });

    const existingPath = await findExistingHandoffBySourceId(handoffDir, cleanSourceId);
    if (existingPath) {
      return res.json({
        ok: true,
        path: existingPath,
        relativePath: path.relative(currentProject.path, existingPath).replace(/\\/g, '/'),
        task: null,
        taskSkipped: 'This todo was already handed off.',
      });
    }

    const baseName = `${handedOffAt.toISOString().slice(0, 10)}-${slugify(cleanTitle)}`;
    let filePath = path.join(handoffDir, `${baseName}.md`);
    let counter = 2;
    while (fs.existsSync(filePath)) {
      filePath = path.join(handoffDir, `${baseName}-${counter++}.md`);
    }

    const body = [
      `# ${escapeMd(cleanTitle)}`,
      '',
      `Project: ${currentProject.name || inferProjectName(currentProject.path)}`,
      `Source: ${sourceTitle || 'Todo List'}`,
      cleanSourceId ? `Source ID: ${cleanSourceId}` : null,
      `Assignee: ${assignee || 'unassigned'}`,
      `Priority: ${priority || 'normal'}`,
      `Handed off: ${handedOffAt.toISOString()}`,
      '',
      '## Work',
      escapeMd(cleanText),
      '',
      '## Handoff Contract',
      '- Treat this as the source of truth for this todo item.',
      '- Make the smallest scoped change that completes the work.',
      '- Update this handoff or leave a report before marking complete.',
      '',
    ].filter(v => v !== null).join('\n');

    await fs.promises.writeFile(filePath, body, 'utf8');

    let task = null;
    let taskSkipped = null;
    if (assignee) {
      const subs = await getSubAgents(assignee);
      const chosen = chooseHandoffSubAgent(subs, currentProject, cleanText);
      if (chosen) {
        task = await createAgentTask({
          parentId: assignee,
          assigneeId: chosen.id,
          projectId: chosen.project_id || currentProject.name || null,
          project: currentProject.name || currentProject.path,
          title: cleanTitle,
          prompt: [
            cleanText,
            '',
            `Handoff file: ${filePath}`,
            `Project path: ${currentProject.path}`,
          ].join('\n'),
          priority,
        });
      } else {
        taskSkipped = `No active sub-agent exists under ${assignee}. Handoff file was still written.`;
      }
    }

    res.json({
      ok: true,
      path: filePath,
      relativePath: path.relative(currentProject.path, filePath).replace(/\\/g, '/'),
      task,
      taskSkipped,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
