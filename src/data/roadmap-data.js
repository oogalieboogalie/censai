// Current landing-page roadmap view.
export const TIMELINE_START = '2026-05-20';
export const TIMELINE_END = '2026-07-15';

export const ROADMAP_ITEMS = [
  {
    id: 'mvp',
    date: '2026-05-20',
    phase: 'MVP',
    title: 'Working Prototype',
    description: 'Initial canvas integration and motion proved the workspace concept works.',
    status: 'completed',
  },
  {
    id: 'guardrails',
    date: '2026-06-10',
    phase: 'Now',
    title: 'Guardrails + Window Contract',
    description: 'Window SDK validation, CI checks, size ratchet, self-host docs, and the Censai naming pass are in place.',
    status: 'completed',
  },
  {
    id: 'artifacts',
    date: '2026-06-18',
    phase: 'Next',
    title: 'Artifact + Event Ledger',
    description: 'Give canvas objects durable history, ownership, relationships, and handoffs.',
    status: 'in-progress',
  },
  {
    id: 'gateway',
    date: '2026-06-28',
    phase: 'Gateway',
    title: 'Unified AI Gateway',
    description: 'Route model calls through one chokepoint so usage, providers, and future cloud credits can be managed cleanly.',
    status: 'planned',
  },
  {
    id: 'packages',
    date: '2026-07-08',
    phase: 'Packages',
    title: 'Plugin Ecosystem',
    description: 'Grow the window contract into installable tools, integrations, agents, and packages.',
    status: 'planned',
  },
];
