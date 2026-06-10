import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import session from 'express-session';
import { createLogger } from '../logger.js';

const log = createLogger('http');
const APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:5173';
const QUIET_PATHS = [/^\/api\/health$/, /^\/api\/client-state/, /^\/api\/local-dev-restarts/];

export function setupMiddleware(app) {
  app.use(cors({ origin: APP_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '10mb' }));

  // Request logging
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      const quiet = QUIET_PATHS.some((re) => re.test(req.path));
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : (quiet ? 'debug' : 'info');
      log[level](`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    });
    next();
  });

  const SESSION_SECRET =
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV === 'production'
      ? null
      : crypto.randomBytes(32).toString('hex'));

  if (!SESSION_SECRET) {
    throw new Error('SESSION_SECRET is required in production');
  }

  app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 1000 * 60 * 60 * 24 * 30 } // 30 days
  }));
}
