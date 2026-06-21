import path from 'path';
import { getSecret } from '../../secrets.js';
import { recordProvenance } from '../../operational-intelligence/provenance.js';
import { runnerClient } from '../../runner/client.js';

export async function handleLocalTool(agentId, name, args) {
  switch (name) {
    case 'local_list_dir': {
      try {
        // Resolve relative paths against the server cwd (project root) so
        // agents don't have to guess the absolute root. Absolute paths pass
        // through unchanged.
        const abs = path.resolve(args.dir_path);
        const files = await runnerClient.fsList(abs);
        const listing = files.map(f => `${f.isDirectory ? '[DIR] ' : '[FILE]'} ${f.name}`).join('\n');
        const header = abs !== args.dir_path ? `(resolved to ${abs})\n` : '';
        return header + (listing || '(empty directory)');
      } catch (err) {
        return `Failed to read directory: ${err.message}`;
      }
    }
    case 'local_read_file': {
      try {
        const abs = path.resolve(args.file_path);
        const content = await runnerClient.fsRead(abs);
        return content;
      } catch (err) {
        return `Failed to read file: ${err.message}`;
      }
    }
    case 'local_write_file': {
      try {
        const abs = path.resolve(args.file_path);
        await runnerClient.fsWrite(abs, args.content);

        if (args.__provenance) {
          await recordProvenance({
            workspace_id: 'local',
            agent_id: args.__provenance.agent_id,
            prompt: args.__provenance.prompt,
            model: args.__provenance.model,
            code_snippet: args.content,
            file_path: args.file_path,
            metadata: { abs_path: abs }
          }).catch(err => console.error('[Provenance] Failed to record:', err.message));
        }

        return `Successfully wrote to ${abs}`;
      } catch (err) {
        return `Failed to write file: ${err.message}`;
      }
    }

    case 'web_search': {
      const apiKey = getSecret('TAVILY_API_KEY');
      if (!apiKey) return 'Error: TAVILY_API_KEY not configured in .env';
      try {
        const body = {
          query: args.query,
          search_depth: args.search_depth || 'basic',
          max_results: Math.min(args.max_results || 5, 10),
        };
        const res = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const errText = await res.text();
          return `Search failed (${res.status}): ${errText}`;
        }
        const data = await res.json();
        const results = data.results || [];
        if (results.length === 0) return `No results found for "${args.query}".`;
        return results.map((r, i) =>
          `[${i + 1}] ${r.title}\n    ${r.url}\n    ${r.content}`
        ).join('\n\n');
      } catch (err) {
        return `Search error: ${err.message}`;
      }
    }

    default:
      throw new Error(`Unknown local tool: ${name}`);
  }
}
