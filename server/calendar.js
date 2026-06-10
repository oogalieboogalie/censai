import { google } from 'googleapis';
import express from 'express';

export const calendarRouter = express.Router();

import fs from 'fs';
import path from 'path';

const TOKEN_PATH = process.env.GOOGLE_TOKENS_PATH || path.resolve('.homebase-state', 'google_tokens.json');
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback';

export function getOAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.G_CLIENT_ID,
    process.env.G_SECRET,
    GOOGLE_REDIRECT_URI
  );
  if (fs.existsSync(TOKEN_PATH)) {
    const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oauth2Client.setCredentials(tokens);
    return oauth2Client;
  }
  return null;
}

// Get upcoming events
calendarRouter.get('/events', async (req, res) => {
  const auth = getOAuthClient();
  if (!auth) return res.status(401).json({ error: 'Not authenticated with Google' });

  try {
    const calendar = google.calendar({ version: 'v3', auth });

    // Default to a 7 day window if not specified
    let timeMin = new Date().toISOString();
    let timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 7);
    timeMax = timeMax.toISOString();

    if (req.query.start) timeMin = new Date(req.query.start).toISOString();
    if (req.query.end) timeMax = new Date(req.query.end).toISOString();

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const googleColors = {
      '1': '#7986CB', '2': '#33B679', '3': '#8E24AA', '4': '#E67C73',
      '5': '#F6BF26', '6': '#F4511E', '7': '#039BE5', '8': '#616161',
      '9': '#3F51B5', '10': '#0B8043', '11': '#D50000'
    };

    const events = response.data.items.map(ev => ({
      id: ev.id,
      title: ev.summary || 'Untitled Event',
      description: ev.description || '',
      start: ev.start.dateTime || ev.start.date,
      end: ev.end.dateTime || ev.end.date,
      link: ev.htmlLink,
      color: ev.colorId ? googleColors[ev.colorId] : 'var(--ps-blue)'
    }));

    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add an event
calendarRouter.post('/add', async (req, res) => {
  const auth = getOAuthClient();
  if (!auth) return res.status(401).json({ error: 'Not authenticated with Google' });

  const { title, start, end, description } = req.body;
  if (!title || !start || !end) {
    return res.status(400).json({ error: 'Missing title, start, or end in request body' });
  }

  try {
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary: title,
      description: description || '',
      start: { dateTime: new Date(start).toISOString() },
      end: { dateTime: new Date(end).toISOString() },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    res.json({ ok: true, eventId: response.data.id, link: response.data.htmlLink });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
