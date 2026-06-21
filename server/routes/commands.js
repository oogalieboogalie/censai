import express from 'express';
import pool from '../db.js';
import { recordCommandAudit } from '../commands/audit.js';
import { commandContextFromRequest } from '../commands/context.js';
import { executeCommand, listCommands } from '../commands/registry.js';

export const commandsRouter = express.Router();

commandsRouter.get('/commands', (_req, res) => {
  res.json({ commands: listCommands() });
});

commandsRouter.post('/commands/:commandId/execute', async (req, res) => {
  const context = commandContextFromRequest(req);
  const input = req.body || {};

  try {
    const execution = await executeCommand(req.params.commandId, { context, input, request: req });
    const audit = await recordCommandAudit({
      db: pool,
      command: execution.command,
      context,
      input,
      output: execution.result,
      error: null,
    });
    res.json({
      ok: true,
      command: execution.command,
      context,
      result: execution.result,
      auditEventId: audit?.id || null,
    });
  } catch (error) {
    const command = listCommands().find(entry => entry.id === req.params.commandId) || {
      id: req.params.commandId,
      sideEffects: [],
      requiredCapabilities: [],
    };
    const audit = await recordCommandAudit({
      db: pool,
      command,
      context,
      input,
      output: null,
      error,
    });
    res.status(error.statusCode || 400).json({
      ok: false,
      commandId: req.params.commandId,
      context,
      code: error.code || 'COMMAND_FAILED',
      error: error.message,
      auditEventId: audit?.id || null,
    });
  }
});
