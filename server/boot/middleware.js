import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import session from 'express-session';
import pool from '../db.js';
import { createLogger } from '../logger.js';
import {
  optionalSecret,
  requireProductionSecret,
} from '../secrets.js';
import { getSessionCookieOptions } from './sessionConfig.js';
import { createCsrfOriginGuard } from '../middleware/csrfOriginGuard.js';

const log = createLogger('http');
const APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:5173';
const QUIET_PATHS = [/^\/api\/health$/, /^\/api\/client-state/, /^\/api\/local-dev-restarts/];

const PostgresStore = class extends session.Store {
  constructor(dbPool) {
    super();
    this.pool = dbPool;
  }
  async get(sid, callback) {
    try {
      const res = await this.pool.query('SELECT sess FROM session WHERE sid = $1', [sid]);
      if (res.rows.length === 0) return callback(null, null);
      callback(null, res.rows[0].sess);
    } catch (err) {
      callback(err);
    }
  }
  async set(sid, sess, callback) {
    try {
      await this.pool.query(
        'INSERT INTO session (sid, sess, expire) VALUES ($1, $2, NOW() + INTERVAL \'30 days\') ON CONFLICT (sid) DO UPDATE SET sess = $2, expire = NOW() + INTERVAL \'30 days\'',
        [sid, JSON.stringify(sess)]
      );
      callback(null);
    } catch (err) {
      callback(err);
    }
  }
  async destroy(sid, callback) {
    try {
      await this.pool.query('DELETE FROM session WHERE sid = $1', [sid]);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }
};

export function setupMiddleware(app) {
  app.set('trust proxy', 1);
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isLocal = origin.startsWith('http://localhost:') ||
                      origin.startsWith('http://127.0.0.1:') ||
                      origin.startsWith('tauri://') ||
                      origin === APP_ORIGIN;
      if (isLocal) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(createCsrfOriginGuard({ appOrigin: APP_ORIGIN }));

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

  const SESSION_SECRET = requireProductionSecret('SESSION_SECRET')
    || optionalSecret('SESSION_SECRET')
    || crypto.randomBytes(32).toString('hex');

  const store = new PostgresStore(pool);

  app.set('sessionStore', store);

  app.use(session({
    store,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: getSessionCookieOptions(APP_ORIGIN),
  }));
}
