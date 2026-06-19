import {
  createSubAgent,
  getSubAgents,
  deleteSubAgent,
  updateSubAgent,
  scratchpadWrite,
  scratchpadRead,
  scratchpadClear,
  createAgentTask
} from '../../memory.js';
import {
  getProject,
  getProjectByName,
  isGithubProject,
  ensureSubAgentBranch,
  mirrorSubAgentToDisk,
  removeSubAgentFromDisk
} from '../../workspaces.js';
import { findReusableSubAgents, formatReuseNotice } from './subagentReuse.js';

export async function handleSubagentTool(agentId, name, args, context = {}) {
  switch (name) {
    case 'create_sub_agent': {
      let project = null;
      if (args.project) {
        project = await getProject(args.project);
        if (!project) {
          project = await getProjectByName(agentId, args.project);
        }
        if (!project) return `No project named "${args.project}" found. Use open_project first.`;
      }

      // Tier → default model mapping
      let modelProvider = null;
      let modelName = null;
      const tier = args.tier;
      if (tier === 'nano') {
        modelProvider = 'ollama';
        modelName = 'gemma4:31b:cloud';
      } else if (tier === 'worker') {
        modelProvider = 'ollama';
        modelName = 'minimax-m2.5:cloud';
      } else if (tier === 'reviewer') {
        modelProvider = 'ollama';
        modelName = 'gemma4:31b:cloud';
      }

      // Class → default model mapping (overrides tier if class provided)
      const agentClass = args.class;
      const REVIEW_SPECIALTY_PROMPTS = {
        code:            'You are a code quality reviewer. Focus on correctness, readability, test coverage, and adherence to project conventions.',
        schema:          'You are a database schema reviewer. Check for missing indexes, N+1 risks, migration safety, and data integrity constraints.',
        infra:           'You are an infrastructure reviewer. Assess Docker configs, environment variables, service dependencies, and deployment safety.',
        security:        'You are a security reviewer. Hunt for injection risks, auth bypasses, exposed secrets, insecure defaults, and OWASP top-10 issues.',
        'api-design':    'You are an API design reviewer. Evaluate endpoint naming, HTTP method correctness, error responses, versioning, and contract consistency.',
        'test-coverage': 'You are a test coverage reviewer. Identify untested code paths, missing edge cases, flaky test patterns, and coverage gaps.',
      };

      if (agentClass === 'scout') {
        modelProvider = modelProvider || 'ollama';
        modelName = modelName || 'gemma4:31b:cloud';
      } else if (agentClass === 'builder') {
        modelProvider = modelProvider || 'ollama';
        modelName = modelName || 'minimax-m2.5:cloud';
      } else if (agentClass === 'auditor') {
        modelProvider = modelProvider || 'ollama';
        modelName = modelName || 'minimax-m2.5:cloud';
      } else if (agentClass === 'sentry') {
        modelProvider = modelProvider || 'ollama';
        modelName = modelName || 'gemma4:31b:cloud';
      }

      // Explicit model override: "provider/name" or just "name" (defaults to ollama)
      if (args.model) {
        const slashIdx = args.model.indexOf('/');
        if (slashIdx > 0) {
          modelProvider = args.model.slice(0, slashIdx);
          modelName = args.model.slice(slashIdx + 1);
        } else {
          modelProvider = 'ollama';
          modelName = args.model;
        }
      }

      if (!args.force_new) {
        const existing = await getSubAgents(agentId);
        const reusable = findReusableSubAgents(existing, {
          name: args.name,
          class: agentClass,
          permission: args.permission,
          projectId: project?.id,
          specialty: args.specialty,
        });
        if (reusable.length > 0) return formatReuseNotice(reusable);
      }

      let sub = await createSubAgent(agentId, {
        name: args.name,
        role: args.role,
        specialty: args.specialty,
        permission: args.permission || (agentClass === 'builder' ? 'worker' : agentClass === 'scout' || agentClass === 'sentry' ? 'researcher' : agentClass === 'auditor' ? 'reviewer' : 'worker'),
        projectId: project?.id || null,
        modelProvider,
        modelName,
        preset: args.preset,
        class: agentClass || null,
        reviewSpecialty: args.review_specialty || null,
        systemPromptInject: args.review_specialty ? REVIEW_SPECIALTY_PROMPTS[args.review_specialty] : null,
      });

      // If this is a GitHub project and a worker sub-agent, give them their own branch
      let branchNote = '';
      if (project && isGithubProject(project) && sub.permission === 'worker') {
        try {
          const branch = await ensureSubAgentBranch(project, sub);
          if (branch) {
            await updateSubAgent(sub.id, { github_branch: branch });
            sub.github_branch = branch;
            branchNote = ` Branch \`${branch}\` ready in ${project.repo}.`;
          }
        } catch (e) {
          branchNote = ` (branch creation failed: ${e.message})`;
        }
      }

      try { await mirrorSubAgentToDisk(agentId, sub); } catch {}
      const projectMsg = project ? `, bound to ${project.name}` : ' (unbound — no project assigned)';
      const classNote = agentClass ? ` Class: ${agentClass}.` : '';
      const specialtyNote = sub.review_specialty ? ` Specialty: ${sub.review_specialty}.` : '';
      return `Created sub-agent "${sub.name}" (${sub.id}). Permission: ${sub.permission}${projectMsg}.${classNote}${specialtyNote}${branchNote}`;
    }
    case 'list_sub_agents': {
      const subs = await getSubAgents(agentId);
      if (subs.length === 0) return 'No sub-agents yet. Use create_sub_agent to create one.';
      return subs.map(s => {
        const proj = s.project_id ? ` [project: ${s.project_id}]` : ' [unbound]';
        return `• ${s.name} (${s.id}) — ${s.permission || 'worker'}${proj}${s.role ? ` — ${s.role}` : ''}`;
      }).join('\n');
    }
    case 'remove_sub_agent': {
      const subs = await getSubAgents(agentId);
      const match = subs.find(s =>
        s.name.toLowerCase() === args.name.toLowerCase() ||
        s.id === args.name.toLowerCase()
      );
      if (!match) return `No sub-agent found matching "${args.name}".`;
      await deleteSubAgent(match.id);
      try { await removeSubAgentFromDisk(agentId, match); } catch {}
      return `Deactivated sub-agent "${match.name}".`;
    }
    case 'submit_agent_task': {
      const subs = await getSubAgents(agentId);
      const match = subs.find(s =>
        s.name.toLowerCase() === args.sub_agent.toLowerCase() ||
        s.id === args.sub_agent.toLowerCase()
      );
      if (!match) return `Error: No sub-agent found matching "${args.sub_agent}". Create them first or double check spelling.`;

      const task = await createAgentTask({
        parentId: agentId,
        assigneeId: match.id,
        projectId: match.project_id || null,
        project: args.project || match.project_id || null,
        title: args.title,
        prompt: args.prompt,
        priority: args.priority || 'normal',
        wakeId: context.agentWakeId || null,
      });
      return `Successfully queued task "${task.title}" (ID: ${task.id}) for sub-agent "${match.name}". The task worker will execute it asynchronously.`;
    }

    // ─── SUB-AGENT SCRATCHPAD ─────────────────────────────────────

    case 'scratchpad_write': {
      const subs = await getSubAgents(agentId);
      const match = subs.find(s =>
        s.name.toLowerCase() === args.sub_agent.toLowerCase() ||
        s.id === args.sub_agent.toLowerCase()
      );
      if (!match) return `No sub-agent found matching "${args.sub_agent}". Create one first with create_sub_agent.`;
      await scratchpadWrite(match.id, args.project || 'default', args.key, args.value);
      return `Wrote "${args.key}" to ${match.name}'s scratchpad (project: ${args.project || 'default'}).`;
    }
    case 'scratchpad_read': {
      const subs = await getSubAgents(agentId);
      const match = subs.find(s =>
        s.name.toLowerCase() === args.sub_agent.toLowerCase() ||
        s.id === args.sub_agent.toLowerCase()
      );
      if (!match) return `No sub-agent found matching "${args.sub_agent}".`;
      const data = await scratchpadRead(match.id, args.project || 'default', args.key);
      if (!data) return `No data found${args.key ? ` for key "${args.key}"` : ''} in ${match.name}'s scratchpad.`;
      if (Array.isArray(data)) {
        if (data.length === 0) return `${match.name}'s scratchpad is empty for project "${args.project || 'default'}".`;
        return data.map(d => `[${d.key}]: ${d.value}`).join('\n');
      }
      return `[${data.key}]: ${data.value}`;
    }
    case 'scratchpad_clear': {
      const subs = await getSubAgents(agentId);
      const match = subs.find(s =>
        s.name.toLowerCase() === args.sub_agent.toLowerCase() ||
        s.id === args.sub_agent.toLowerCase()
      );
      if (!match) return `No sub-agent found matching "${args.sub_agent}".`;
      const count = await scratchpadClear(match.id, args.project || 'default');
      return `Cleared ${count} entries from ${match.name}'s scratchpad (project: ${args.project || 'default'}).`;
    }

    default:
      throw new Error(`Unknown subagent tool: ${name}`);
  }
}
