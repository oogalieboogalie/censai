import express from 'express';
import { google } from 'googleapis';
import crypto from 'crypto';
import pool from '../db.js';
import { getClientAccessPolicy } from '../security/byokPolicy.js';

export const authRouter = express.Router();

const APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:5173';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback';

const oauth2Client = new google.auth.OAuth2(
  process.env.G_CLIENT_ID,
  process.env.G_SECRET,
  GOOGLE_REDIRECT_URI
);

authRouter.get('/google', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauth_state = state;

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    prompt: 'select_account consent', // Avoid stale Google sessions, then request current scopes
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/spreadsheets'
    ],
    state,
  });
  req.session.save((err) => {
    if (err) {
      console.error('Failed to persist Google OAuth state:', err);
      return res.status(500).send('Could not start Google authentication.');
    }
    res.redirect(url);
  });
});

authRouter.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) {
      delete req.session.oauth_state;
      return res.status(400).send('Google authorization was not completed. Please try again.');
    }
    const sessionState = req.session.oauth_state;
    delete req.session.oauth_state;

    if (!code || !state || state !== sessionState) {
      return res.status(400).send('Invalid or expired Google authentication state.');
    }

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Retrieve email and name using oauth2 API
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;
    const name = userInfo.data.name;

    if (!email) {
      return res.status(400).send('Could not retrieve email from Google OAuth');
    }

    // Lookup user in DB
    let userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user;

    if (userRes.rows.length === 0) {
      const countRes = await pool.query('SELECT COUNT(*)::int as count FROM users');
      const role = countRes.rows[0].count === 0 ? 'admin' : 'user';

      // Access control
      if (role !== 'admin') {
        const allowedUsers = process.env.ALLOWED_USERS ? process.env.ALLOWED_USERS.split(',').map(e => e.trim().toLowerCase()) : [];
        if (allowedUsers.length > 0 && !allowedUsers.includes(email.toLowerCase())) {
          return res.status(403).send('Access denied. You are not on the allowed list.');
        }
      }

      const insertRes = await pool.query(
        'INSERT INTO users (email, name, role) VALUES ($1, $2, $3) RETURNING *',
        [email, name || email.split('@')[0], role]
      );
      user = insertRes.rows[0];
    } else {
      user = userRes.rows[0];
    }

    // Store tokens in user_tokens table
    await pool.query(
      `INSERT INTO user_tokens (user_id, provider, access_token, refresh_token, expiry_date, scope)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, provider) DO UPDATE
       SET access_token = $3, refresh_token = COALESCE($4, user_tokens.refresh_token), expiry_date = $5, scope = $6, updated_at = NOW()`,
      [user.id, 'google', tokens.access_token, tokens.refresh_token || null, tokens.expiry_date || null, tokens.scope || null]
    );

    req.session.googleTokens = tokens;
    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.save((err) => {
      if (err) {
        console.error('Failed to persist authenticated Google session:', err);
        return res.status(500).send('Google authentication could not be saved.');
      }
      res.redirect(APP_ORIGIN);
    });
  } catch (err) {
    console.error('OAuth Callback Error:', {
      message: err.message,
      code: err.code,
      googleError: err.response?.data?.error,
      googleDescription: err.response?.data?.error_description,
    });
    res.status(500).send('Google authentication failed.');
  }
});

authRouter.post('/developer', async (req, res) => {
  const isOauthConfigured = !!(process.env.G_CLIENT_ID && process.env.G_SECRET);
  if (isOauthConfigured && process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Developer login disabled when Google OAuth is configured' });
  }

  const { email, name } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    let userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user;

    if (userRes.rows.length === 0) {
      const countRes = await pool.query('SELECT COUNT(*)::int as count FROM users');
      const role = countRes.rows[0].count === 0 ? 'admin' : 'user';

      if (role !== 'admin') {
        const allowedUsers = process.env.ALLOWED_USERS ? process.env.ALLOWED_USERS.split(',').map(e => e.trim().toLowerCase()) : [];
        if (allowedUsers.length > 0 && !allowedUsers.includes(email.toLowerCase())) {
          return res.status(403).json({ error: 'Access denied. You are not on the allowed list.' });
        }
      }

      const insertRes = await pool.query(
        'INSERT INTO users (email, name, role) VALUES ($1, $2, $3) RETURNING *',
        [email, name || email.split('@')[0], role]
      );
      user = insertRes.rows[0];
    } else {
      user = userRes.rows[0];
    }

    req.session.userId = user.id;
    req.session.userRole = user.role;
    res.json({ ok: true, user });
  } catch (err) {
    console.error('Developer login error:', err);
    res.status(500).json({ error: err.message });
  }
});

authRouter.get('/session', async (req, res) => {
  const oauthConfigured = !!(process.env.G_CLIENT_ID && process.env.G_SECRET);
  if (req.session.userId) {
    try {
      const userRes = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [req.session.userId]);
      if (userRes.rows.length > 0) {
        const user = userRes.rows[0];
        req.session.userRole = user.role;
        return res.json({
          authenticated: true,
          user,
          oauthConfigured,
          ...getClientAccessPolicy(user.role),
        });
      }
    } catch (err) {
      console.error('Session user fetch error:', err);
    }
  }
  res.json({
    authenticated: false,
    oauthConfigured,
    ...getClientAccessPolicy(null),
  });
});

authRouter.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Failed to destroy session:', err);
      return res.status(500).send('Could not log out.');
    }
    res.clearCookie('connect.sid');
    res.json({ authenticated: false, message: 'Logged out successfully' });
  });
});
