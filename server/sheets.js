import { google } from 'googleapis';
import express from 'express';
import { getOAuthClient } from './calendar.js';

export const sheetsRouter = express.Router();

// Read spreadsheet values
sheetsRouter.get('/read', async (req, res) => {
  const auth = getOAuthClient();
  if (!auth) return res.status(401).json({ error: 'Not authenticated with Google' });

  const { spreadsheet_id, range } = req.query;
  if (!spreadsheet_id || !range) {
    return res.status(400).json({ error: 'Missing spreadsheet_id or range in request' });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheet_id,
      range,
    });
    res.json({ values: response.data.values || [] });
  } catch (err) {
    console.error('Google Sheets Read Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Append a row of values
sheetsRouter.post('/append', async (req, res) => {
  const auth = getOAuthClient();
  if (!auth) return res.status(401).json({ error: 'Not authenticated with Google' });

  const { spreadsheet_id, range, values } = req.body;
  if (!spreadsheet_id || !range || !values) {
    return res.status(400).json({ error: 'Missing spreadsheet_id, range, or values in request' });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheet_id,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [values],
      },
    });
    res.json({ ok: true, updatedRange: response.data.updates?.updatedRange });
  } catch (err) {
    console.error('Google Sheets Append Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update a specific cell or range
sheetsRouter.post('/update', async (req, res) => {
  const auth = getOAuthClient();
  if (!auth) return res.status(401).json({ error: 'Not authenticated with Google' });

  const { spreadsheet_id, range, value } = req.body;
  if (!spreadsheet_id || !range || value === undefined) {
    return res.status(400).json({ error: 'Missing spreadsheet_id, range, or value in request' });
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheet_id,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[value]],
      },
    });
    res.json({ ok: true, updatedCells: response.data.updatedCells });
  } catch (err) {
    console.error('Google Sheets Update Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
