import { localApiUrl } from '../helpers.js';

export async function handleSheetsTool(agentId, name, args) {
  switch (name) {
    case 'sheets_read_range': {
      const res = await fetch(localApiUrl('/api/sheets/read'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return JSON.stringify(data.values, null, 2);
    }
    case 'sheets_append_row': {
      const res = await fetch(localApiUrl('/api/sheets/append'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return `Successfully appended row. Updated Range: ${data.updatedRange}`;
    }
    case 'sheets_update_cell': {
      const res = await fetch(localApiUrl('/api/sheets/update'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      return `Successfully updated cell. Cells updated: ${data.updatedCells}`;
    }
    default:
      throw new Error(`Unknown Sheets tool: ${name}`);
  }
}
