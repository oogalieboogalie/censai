import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import crypto from 'crypto';

export const authRouter = express.Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_STATE_DIR = path.resolve(path.join(__dirname, '..', '..', process.env.CENSAI_STATE_DIR || '.censai-state'));
const GOOGLE_TOKENS_PATH = process.env.GOOGLE_TOKENS_PATH || path.join(LOCAL_STATE_DIR, 'google_tokens.json');
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
    prompt: 'consent',      // Force consent screen to prompt for new scopes
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/spreadsheets'
    ],
    state,
  });
  res.redirect(url);
});

authRouter.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const sessionState = req.session.oauth_state;
    delete req.session.oauth_state;

    if (!state || state !== sessionState) {
      return res.status(400).send('Invalid state parameter');
    }

    const { tokens } = await oauth2Client.getToken(code);
    req.session.googleTokens = tokens;
    await fs.promises.mkdir(path.dirname(GOOGLE_TOKENS_PATH), { recursive: true });
    await fs.promises.writeFile(GOOGLE_TOKENS_PATH, JSON.stringify(tokens), 'utf8');
    res.redirect(APP_ORIGIN);
  } catch (err) {
    console.error('OAuth Callback Error:', err);
    res.status(500).send('Authentication failed');
  }
});

authRouter.get('/session', (req, res) => {
  if (req.session.googleTokens) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

authRouter.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Failed to destroy session:', err);
      return res.status(500).send('Could not log out.');
    }
    res.clearCookie('connect.sid'); // The default session cookie name
    res.json({ authenticated: false, message: 'Logged out successfully' });
  });
});
