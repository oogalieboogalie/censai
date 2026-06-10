import express from 'express';
import { clientStateRouter } from './clientState.js';
import { browserRouter } from './browser.js';

export const filesRouter = express.Router();

filesRouter.use(clientStateRouter);
filesRouter.use(browserRouter);
