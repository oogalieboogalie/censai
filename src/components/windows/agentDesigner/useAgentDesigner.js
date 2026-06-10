import React from 'react';
import { api } from '../../../lib/api.js';
import { getAgentById } from '../../../lib/agentStore.js';
import { DEFAULT_TOOLS, defaultModelForProvider, uniqueAgentId } from './modelConfig.js';

export function useAgentDesigner(win, onCreateAgent, onUpdate, agents, groups) {
  const [agentType, setAgentType] = React.useState(win.agentType || 'core');
  const [name, setName] = React.useState('My Agent');
  const [description, setDescription] = React.useState('');
  const [instructions, setInstructions] = React.useState('');
  const [role, setRole] = React.useState('');
  const [hue, setHue] = React.useState(222);
  const [provider, setProvider] = React.useState('google');
  const [model, setModel] = React.useState(defaultModelForProvider('google'));
  const [templateAgentId, setTemplateAgentId] = React.useState('');
  const [parentAgentId, setParentAgentId] = React.useState('architect');
  const [groupIds, setGroupIds] = React.useState(() => groups.some(g => g.id === 'core') ? ['core'] : []);
  const [selectedTools, setSelectedTools] = React.useState(DEFAULT_TOOLS);
  const [toolSearch, setToolSearch] = React.useState('');
  const [githubRepos, setGithubRepos] = React.useState('');
  const [localPaths, setLocalPaths] = React.useState('');
  const [toolCatalog, setToolCatalog] = React.useState({ tools: [], categories: [] });
  const [status, setStatus] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const inputRef = React.useRef(null);

  React.useEffect(() => { setTimeout(() => inputRef.current?.focus(), 30); }, []);

  React.useEffect(() => {
    let alive = true;
    api.getToolCatalog()
      .then(catalog => { if (alive) setToolCatalog(catalog); })
      .catch(err => { if (alive) setStatus(`Tool catalog unavailable: ${err.message}`); });
    return () => { alive = false; };
  }, []);

  const templateAgent = templateAgentId ? getAgentById(templateAgentId) : null;
  const parentAgent = agentType === 'sub' ? getAgentById(parentAgentId) : null;
  const glyph = (name.trim()[0] || '?').toUpperCase();
  const selectedToolRows = selectedTools
    .map(toolName => (toolCatalog.tools || []).find(tool => tool.name === toolName) || { name: toolName, label: toolName, category: 'Selected' })
    .filter(Boolean);
  const preview = {
    id: 'preview-agent',
    name: name || (agentType === 'core' ? 'Core agent' : 'Sub-agent'),
    role: description || role || templateAgent?.role || (agentType === 'core' ? 'No information added' : 'Agent that handles a specific task'),
    glyph,
    hue,
    kind: 'ai',
  };

  const applyTemplate = (agentId) => {
    const agent = getAgentById(agentId);
    if (!agent) return;
    setTemplateAgentId(agentId);
    setRole(current => current.trim() ? current : agent.role);
    setDescription(current => current.trim() ? current : agent.role);
    setInstructions(current => current.trim() ? current : agent.system_prompt || agent.systemPrompt || '');
    setHue(agent.hue ?? hue);
    if (agent.model_provider) setProvider(agent.model_provider);
    if (agent.model_name) setModel(agent.model_name);
    if (Array.isArray(agent.tool_scopes?.tools)) setSelectedTools(agent.tool_scopes.tools);
  };

  const toggleGroup = (groupId) => {
    setGroupIds(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]);
  };

  const toggleTool = (toolName) => {
    setSelectedTools(prev => prev.includes(toolName) ? prev.filter(n => n !== toolName) : [...prev, toolName]);
  };

  const createAgent = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setStatus('Saving agent...');
    const toolScopes = {
      mode: 'custom',
      tools: selectedTools,
      scopes: {
        github: { repos: githubRepos.split(/[\n,]+/).map(repo => repo.trim()).filter(Boolean) },
        local: { paths: localPaths.split(/[\n,]+/).map(path => path.trim()).filter(Boolean) },
        project: { mode: 'current' },
      },
    };

    try {
      let saved;
      if (agentType === 'sub') {
        saved = await api.createSubAgent({
          parentId: parentAgentId,
          name: name.trim(),
          role: role.trim() || description.trim() || 'Specialist sub-agent',
          specialty: description.trim() || null,
          systemPrompt: instructions.trim() || null,
          hue,
          permission: selectedTools.some(tool => /write|edit|merge|submit|restart|create|comment/.test(tool)) ? 'worker' : 'researcher',
          model_provider: provider,
          model_name: model || defaultModelForProvider(provider),
          toolScopes,
        });
      } else {
        const id = uniqueAgentId(name, agentType, agents);
        saved = await api.createAgent({
          id,
          name: name.trim(),
          role: role.trim() || description.trim() || 'Core teammate',
          glyph,
          hue,
          kind: 'ai',
          personality: description.trim() || null,
          specialty: role.trim() || null,
          system_prompt: instructions.trim() || null,
          model_provider: provider,
          model_name: model || defaultModelForProvider(provider),
          toolScopes,
        });
      }

      const agent = {
        ...saved,
        glyph: saved.glyph || glyph,
        hue: saved.hue ?? hue,
        kind: saved.kind || 'ai',
        agentType,
        templateAgentId: templateAgentId || undefined,
        parentAgentId: agentType === 'sub' ? parentAgentId : undefined,
        tool_scopes: saved.tool_scopes || toolScopes,
      };

      onCreateAgent?.(agent, { groupIds });
      onUpdate?.({ createdAgentId: agent.id, lastCreatedName: agent.name });
      setStatus(`${agent.name} saved with ${selectedTools.length} selected tools.`);
      setName('');
      setDescription('');
      setInstructions('');
      setRole('');
    } catch (err) {
      setStatus(err.message || 'Failed to save agent');
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = (toolCatalog.categories || []).map(category => ({
    ...category,
    tools: (category.tools || []).filter(tool => {
      const needle = `${tool.label} ${tool.name} ${tool.description} ${tool.category}`.toLowerCase();
      return needle.includes(toolSearch.toLowerCase());
    }),
  })).filter(category => category.tools.length > 0);

  return {
    agentType, setAgentType,
    name, setName,
    description, setDescription,
    instructions, setInstructions,
    role, setRole,
    hue, setHue,
    provider, setProvider,
    model, setModel,
    templateAgentId, setTemplateAgentId,
    parentAgentId, setParentAgentId,
    groupIds, setGroupIds,
    selectedTools, setSelectedTools,
    toolSearch, setToolSearch,
    githubRepos, setGithubRepos,
    localPaths, setLocalPaths,
    toolCatalog, setToolCatalog,
    status, setStatus,
    saving, setSaving,
    inputRef,
    templateAgent, parentAgent, glyph, selectedToolRows, preview,
    applyTemplate, toggleGroup, toggleTool, createAgent, filteredCategories,
  };
}
