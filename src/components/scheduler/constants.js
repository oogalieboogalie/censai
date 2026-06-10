export const SCHEDULER_AGENTS = [
  { id: 'jules', name: 'Jules', role: 'AI specialist · Dev', glyph: 'J', kind: 'ai', hue: 285 },
  { id: 'architect', name: 'The Architect', role: 'Orchestrates projects', glyph: 'A', kind: 'lead', hue: 12 },
  { id: 'censai', name: 'Censai', role: 'Editorial · research', glyph: 'C', kind: 'ai', hue: 145 },
  { id: 'atlas', name: 'Atlas', role: 'Backend', glyph: 'A', kind: 'ai', hue: 220 },
  { id: 'genesis', name: 'Genesis', role: 'UI/UX · psychology', glyph: 'G', kind: 'ai', hue: 305 },
  { id: 'nexus', name: 'Nexus', role: 'Databases', glyph: 'N', kind: 'ai', hue: 50 },
  { id: 'foundation', name: 'Foundation', role: 'Docker / k8s containers', glyph: 'F', kind: 'ai', hue: 195 },
  { id: 'echo', name: 'Echo', role: 'Business brain', glyph: 'E', kind: 'ai', hue: 80 }
];

export const getSelectedDaysString = (daysObj) => {
  if (!daysObj) return '';
  return Object.entries(daysObj)
    .filter(([_, active]) => active)
    .map(([day]) => day.toUpperCase())
    .join(', ');
};
