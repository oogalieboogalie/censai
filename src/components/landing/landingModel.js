export const N8N_FORM_URL = 'https://n8n.censai.app/form/e9579fd8-55b5-4564-9d7a-8086303285b9';

export const CYCLING_TERMS = [
  "creator's",
  "planner's",
  "writer's",
  "designer's",
  "coder's",
  "entrepreneur's",
  "researcher's",
  "builder's",
  "maker's",
  "founder's",
  "strategist's",
  "artist's",
  "explorer's",
  "innovator's",
  "storyteller's",
  "operator's",
  "analyst's",
  "inventor's",
  "student's",
  "teacher's",
  "freelancer's",
  "studio's",
  "team's",
];

export const DEFAULT_SIZES = {
  chat: { w: 360, h: 420 },
  todos: { w: 320, h: 360 },
  workflow: { w: 480, h: 320 },
  doc: { w: 480, h: 360 },
  genImage: { w: 460, h: 380 },
  idea: { w: 320, h: 240 },
  group: { w: 380, h: 520 },
  groupChat: { w: 420, h: 540 },
  files: { w: 280, h: 360 },
  browser: { w: 420, h: 320 },
  music: { w: 320, h: 380 },
  stream: { w: 480, h: 320 },
};

export function randomDropSpot({ w, h }, pan = { x: 0, y: 0 }, zoom = 1) {
  const W = window.innerWidth, H = window.innerHeight;
  const jitter = 80;
  const cx = (W / 2 - pan.x) / zoom - w / 2;
  const cy = (H / 2 - pan.y) / zoom - h / 2;
  return {
    x: cx + (Math.random() - 0.5) * jitter * 2,
    y: cy + (Math.random() - 0.5) * jitter * 2,
  };
}

// Pre-populated demo windows shown as a pinned left rail.
// Pinned windows live in a fixed-position rail (set via pinnedRailOffset on Canvas)
// so the rest of the canvas stays open as a clean play area.
// Note: pinned windows are absolutely positioned in the rail, so we manually
// stack them via y-offsets.
export function makeDemoWindows() {
  return [
    {
      id: 'demo-idea',
      kind: 'idea',
      pinned: true,
      x: 0, y: 0, w: 280, h: 190,
      title: 'Pitch deck angles',
      content: 'Three things people keep saying:\n\n• "wait, agents live ON the canvas?"\n• "I want this for team meetings"\n• "is this Figma + Slack + Notion?"\n\nLean into the workshop metaphor.',
    },
    {
      id: 'demo-todos',
      kind: 'todos',
      pinned: true,
      x: 0, y: 210, w: 280, h: 240,
      title: 'This week',
      items: [
        { id: 1, text: 'Ship landing page demo', done: true },
        { id: 2, text: 'Open private beta to 50 people', done: false },
        { id: 3, text: 'Record 60-second walkthrough', done: false },
        { id: 4, text: 'Wire up shared agent memory', done: false },
      ],
    },
  ];
}

