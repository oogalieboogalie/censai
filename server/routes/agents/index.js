import express from 'express';
import { coreRouter } from './core.js';
import { memoryRouter } from './memory.js';
import { communicationRouter } from './communication.js';
import { subagentsRouter } from './subagents.js';
import { tasksRouter } from './tasks.js';
import { milestonesRouter } from './milestones.js';
import { goalsRouter } from './goals.js';
import { familyRouter } from './family.js';
import { knowledgeRouter } from './knowledge.js';

export const agentsRouter = express.Router();

agentsRouter.use(coreRouter);
agentsRouter.use(memoryRouter);
agentsRouter.use(communicationRouter);
agentsRouter.use(subagentsRouter);
agentsRouter.use(tasksRouter);
agentsRouter.use(milestonesRouter);
agentsRouter.use(goalsRouter);
agentsRouter.use(familyRouter);
agentsRouter.use(knowledgeRouter);
