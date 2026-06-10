import express from 'express';
import { createSchedule, getSchedules, updateSchedule, deleteSchedule } from '../memory/schedules.js';

export const schedulesRouter = express.Router();

schedulesRouter.get('/schedules', async (req, res) => {
  try {
    const data = await getSchedules();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

schedulesRouter.post('/schedules', async (req, res) => {
  try {
    const schedule = await createSchedule(req.body);
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

schedulesRouter.patch('/schedules/:id', async (req, res) => {
  try {
    const schedule = await updateSchedule(req.params.id, req.body);
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

schedulesRouter.delete('/schedules/:id', async (req, res) => {
  try {
    await deleteSchedule(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
