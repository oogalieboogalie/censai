// A 30-day view for the roadmap
export const TIMELINE_START = '2026-05-20';
export const TIMELINE_END = '2026-06-20';

export const ROADMAP_ITEMS = [
  {
    id: 'mvp',
    date: '2026-05-20',
    phase: 'MVP',
    title: 'Working Prototype',
    description: 'Initial canvas integration and motion. Proved the concept works.',
    status: 'completed',
  },
  {
    id: 'beta',
    date: '2026-05-27', // 1 week out
    phase: 'Week 1',
    title: 'Private Beta',
    description: 'Inviting early users to break things. Ironing out the bugs and setting up auth.',
    status: 'in-progress',
  },
  {
    id: 'multiplayer',
    date: '2026-06-03', // 2 weeks out
    phase: 'Week 2',
    title: 'Multiplayer Sync',
    description: 'Real-time collaboration. See your teammates and your agents working together on the same canvas.',
    status: 'planned',
  },
  {
    id: 'api',
    date: '2026-06-17', // ~4 weeks out
    phase: 'Week 4',
    title: 'Plugin Ecosystem',
    description: 'Open API for developers to bring their own tools, custom agent models, and backend integrations.',
    status: 'planned',
  },
];
