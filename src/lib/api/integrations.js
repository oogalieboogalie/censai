
/**
   * Creates a GitHub issue for a repository.
   * @param {string} repo
   * @param {string} title
   * @param {string} body
   * @param {string[]} labels
   * @returns {Promise<Object>}
   */
export async function createGithubIssue(repo, title, body, labels) {
    const res = await fetch('/api/github/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo, title, body, labels }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || 'GitHub Issue API failed');
    }
    return await res.json();
  }

/**
   * Fetches Google Calendar events.
   * @param {string} start ISO string
   * @param {string} end ISO string
   * @returns {Promise<Object[]>}
   */
export async function getCalendarEvents(start, end) {
    const res = await fetch(`/api/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
    if (!res.ok) {
      if (res.status === 401) throw new Error('Not authenticated with Google');
      throw new Error('Failed to fetch calendar events');
    }
    return await res.json();
  }

/**
   * Adds a Google Calendar event.
   * @param {Object} event { title, start, end, description }
   * @returns {Promise<Object>}
   */
export async function addCalendarEvent(event) {
    const res = await fetch('/api/calendar/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || 'Failed to add calendar event');
    }
    return await res.json();
  }

/**
 * Reads Google Sheets values.
 * @param {string} spreadsheet_id
 * @param {string} range
 * @returns {Promise<Object>}
 */
export async function readSheets(spreadsheet_id, range) {
  const res = await fetch(`/api/sheets/read?spreadsheet_id=${encodeURIComponent(spreadsheet_id)}&range=${encodeURIComponent(range)}`, {
    method: 'GET',
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error || 'Failed to read sheets');
  }
  return await res.json();
}

/**
 * Appends a row to Google Sheets.
 * @param {string} spreadsheet_id
 * @param {string} range
 * @param {Array<any>} values
 * @returns {Promise<Object>}
 */
export async function appendSheets(spreadsheet_id, range, values) {
  const res = await fetch('/api/sheets/append', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spreadsheet_id, range, values }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error || 'Failed to append sheets');
  }
  return await res.json();
}

/**
 * Updates a specific cell or range in Google Sheets.
 * @param {string} spreadsheet_id
 * @param {string} range
 * @param {any} value
 * @returns {Promise<Object>}
 */
export async function updateSheets(spreadsheet_id, range, value) {
  const res = await fetch('/api/sheets/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spreadsheet_id, range, value }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error || 'Failed to update sheets');
  }
  return await res.json();
}
