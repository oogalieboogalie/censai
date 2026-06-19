import { createProjectHandoffRecord } from './handoffs.js';

export async function createProjectHandoff(req, res) {
  try {
    const result = await createProjectHandoffRecord(req.body || {});
    res.json(result);
  } catch (err) {
    const status = /open a local project|needs a title/i.test(err.message) ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
}
