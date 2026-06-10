import { canvasObjectToLegacyWindow } from './canvasObjectTypes.js';

export function withTimeout(promise, ms, label) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
}

export function withoutUnsupportedWindows(wins = []) {
  return (wins || [])
    .filter(w => w?.kind !== 'whiteboard' && w?.type !== 'whiteboard')
    .map(canvasObjectToLegacyWindow);
}

// Convert screen center to canvas coords so windows spawn in the visible viewport
export function randomDropSpot({ w, h }, pan = { x: 0, y: 0 }, zoom = 1) {
  const W = window.innerWidth, H = window.innerHeight;
  const jitter = 80;
  // Center of screen in canvas-space
  const cx = (W / 2 - pan.x) / zoom - w / 2;
  const cy = (H / 2 - pan.y) / zoom - h / 2;
  return {
    x: cx + (Math.random() - 0.5) * jitter * 2,
    y: cy + (Math.random() - 0.5) * jitter * 2,
  };
}
