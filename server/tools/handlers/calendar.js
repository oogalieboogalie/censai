import { localApiUrl } from '../helpers.js';

export async function handleCalendarTool(agentId, name, args) {
  switch (name) {
    case 'read_calendar': {
      const res = await fetch(localApiUrl('/api/calendar/events'));
      if (!res.ok) throw new Error(await res.text());
      return JSON.stringify(await res.json(), null, 2);
    }
    case 'add_calendar_event': {
      const res = await fetch(localApiUrl('/api/calendar/add'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      });
      if (!res.ok) throw new Error(await res.text());
      return JSON.stringify(await res.json());
    }

    default:
      throw new Error(`Unknown calendar tool: ${name}`);
  }
}
