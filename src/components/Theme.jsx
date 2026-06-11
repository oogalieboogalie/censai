import React from 'react';
import { useWorkspaceStore } from '../lib/store.js';
import { Icon } from './Icons.jsx';
import { api } from '../lib/api.js';

const THEME_KEY = 'censai.theme.v1';
export const DEFAULT_THEME = { hue: 145, chroma: 0.11, lightness: 0.62, mood: 'cream', customVars: {}, gridSnapping: true, borderWidth: 1, fontScale: 1.0 };
const THEME_VAR_DEFAULTS = {
  '--window-bg': 'var(--surface)',
  '--window-title-bg': 'transparent',
  '--window-backdrop': 'none',
  '--window-title-backdrop': 'none',
  '--window-radius': 'var(--radius-card)',
  '--window-shadow': 'var(--shadow-card)',
  '--window-control-idle-opacity': '0.35',
  '--window-extra-controls-display': 'none',
  '--window-strip-bg': 'transparent',
  '--window-strip-height': '0px',
};

const mood = (mode, accent, vars) => ({ mode, accent, vars });

export const MOODS = {
  cream: mood('light', { hue: 145, chroma: 0.11, lightness: 0.62 }, { '--bg':'oklch(0.965 0.008 80)','--canvas':'oklch(0.955 0.012 80)','--surface':'oklch(0.99 0.005 80)','--surface-2':'oklch(0.97 0.008 80)','--hairline':'oklch(0.88 0.008 80)','--hairline-strong':'oklch(0.78 0.01 80)','--ink':'oklch(0.22 0.015 60)','--ink-soft':'oklch(0.42 0.01 60)','--ink-faint':'oklch(0.62 0.008 60)' }),
  slate: mood('light', { hue: 220, chroma: 0.1, lightness: 0.61 }, { '--bg':'oklch(0.965 0.006 240)','--canvas':'oklch(0.955 0.008 240)','--surface':'oklch(0.99 0.003 240)','--surface-2':'oklch(0.97 0.005 240)','--hairline':'oklch(0.88 0.006 240)','--hairline-strong':'oklch(0.74 0.008 240)','--ink':'oklch(0.22 0.012 240)','--ink-soft':'oklch(0.44 0.008 240)','--ink-faint':'oklch(0.64 0.006 240)' }),
  linen: mood('light', { hue: 35, chroma: 0.14, lightness: 0.66 }, { '--bg':'oklch(0.97 0.015 95)','--canvas':'oklch(0.95 0.018 92)','--surface':'oklch(0.99 0.008 95)','--surface-2':'oklch(0.97 0.012 92)','--hairline':'oklch(0.85 0.018 90)','--hairline-strong':'oklch(0.72 0.02 88)','--ink':'oklch(0.24 0.025 60)','--ink-soft':'oklch(0.42 0.018 60)','--ink-faint':'oklch(0.62 0.012 60)' }),
  midnight: mood('dark', { hue: 250, chroma: 0.15, lightness: 0.64 }, { '--bg':'oklch(0.20 0.012 260)','--canvas':'oklch(0.17 0.014 260)','--surface':'oklch(0.245 0.014 260)','--surface-2':'oklch(0.22 0.014 260)','--hairline':'oklch(0.32 0.012 260)','--hairline-strong':'oklch(0.42 0.014 260)','--ink':'oklch(0.94 0.006 260)','--ink-soft':'oklch(0.74 0.008 260)','--ink-faint':'oklch(0.55 0.01 260)' }),
  forest: mood('dark', { hue: 150, chroma: 0.13, lightness: 0.64 }, { '--bg':'oklch(0.20 0.014 155)','--canvas':'oklch(0.17 0.016 155)','--surface':'oklch(0.245 0.016 155)','--surface-2':'oklch(0.22 0.016 155)','--hairline':'oklch(0.32 0.014 155)','--hairline-strong':'oklch(0.42 0.018 155)','--ink':'oklch(0.95 0.012 100)','--ink-soft':'oklch(0.74 0.012 100)','--ink-faint':'oklch(0.55 0.012 100)' }),
  coal: mood('dark', { hue: 145, chroma: 0.07, lightness: 0.68 }, { '--bg':'oklch(0.18 0.005 0)','--canvas':'oklch(0.15 0.006 0)','--surface':'oklch(0.22 0.006 0)','--surface-2':'oklch(0.20 0.006 0)','--hairline':'oklch(0.30 0.005 0)','--hairline-strong':'oklch(0.40 0.006 0)','--ink':'oklch(0.94 0.003 0)','--ink-soft':'oklch(0.72 0.004 0)','--ink-faint':'oklch(0.54 0.005 0)' }),
  openai: mood('dark', { hue: 162, chroma: 0.08, lightness: 0.68 }, { '--bg':'oklch(0.175 0.006 168)','--canvas':'oklch(0.145 0.007 168)','--surface':'oklch(0.245 0.007 168)','--surface-2':'oklch(0.215 0.007 168)','--hairline':'oklch(0.34 0.008 168)','--hairline-strong':'oklch(0.45 0.01 168)','--ink':'oklch(0.94 0.004 168)','--ink-soft':'oklch(0.74 0.006 168)','--ink-faint':'oklch(0.56 0.008 168)','--window-title-bg':'linear-gradient(90deg, oklch(0.18 0.016 160), oklch(0.25 0.018 165))','--window-strip-bg':'linear-gradient(90deg, oklch(0.76 0.08 162), oklch(0.95 0.01 165))','--window-strip-height':'3px','--window-shadow':'0 1px 0 oklch(1 0 0 / 0.06) inset, 0 18px 44px -28px oklch(0 0 0 / 0.75)' }),
  gemini: mood('dark', { hue: 250, chroma: 0.17, lightness: 0.68 }, { '--bg':'oklch(0.145 0.018 260)','--canvas':'oklch(0.115 0.024 260)','--surface':'oklch(0.235 0.018 260)','--surface-2':'oklch(0.195 0.020 260)','--hairline':'oklch(0.31 0.018 260)','--hairline-strong':'oklch(0.45 0.035 255)','--ink':'oklch(0.93 0.008 260)','--ink-soft':'oklch(0.76 0.012 260)','--ink-faint':'oklch(0.57 0.016 260)','--window-title-bg':'linear-gradient(90deg, oklch(0.18 0.035 260), oklch(0.18 0.026 285))','--window-strip-bg':'linear-gradient(90deg, oklch(0.72 0.16 250), oklch(0.70 0.18 300), oklch(0.80 0.14 330))','--window-strip-height':'4px','--window-shadow':'0 0 0 1px oklch(0.50 0.10 265 / 0.42), 0 24px 70px -42px oklch(0.55 0.16 265 / 0.70)' }),
  anthropic: mood('light', { hue: 26, chroma: 0.13, lightness: 0.61 }, { '--bg':'oklch(0.955 0.018 70)','--canvas':'oklch(0.94 0.020 72)','--surface':'oklch(0.985 0.012 70)','--surface-2':'oklch(0.965 0.016 70)','--hairline':'oklch(0.84 0.018 68)','--hairline-strong':'oklch(0.70 0.022 66)','--ink':'oklch(0.24 0.026 45)','--ink-soft':'oklch(0.43 0.024 45)','--ink-faint':'oklch(0.62 0.018 45)','--window-title-bg':'linear-gradient(90deg, oklch(0.92 0.045 45), oklch(0.98 0.018 70))','--window-strip-bg':'oklch(0.68 0.13 28)','--window-strip-height':'4px' }),
  xai: mood('dark', { hue: 95, chroma: 0.07, lightness: 0.72 }, { '--bg':'oklch(0.145 0.003 120)','--canvas':'oklch(0.105 0.004 120)','--surface':'oklch(0.215 0.004 120)','--surface-2':'oklch(0.185 0.004 120)','--hairline':'oklch(0.30 0.004 120)','--hairline-strong':'oklch(0.43 0.006 120)','--ink':'oklch(0.95 0.002 120)','--ink-soft':'oklch(0.75 0.004 120)','--ink-faint':'oklch(0.56 0.006 120)' }),
  moonshot: mood('dark', { hue: 275, chroma: 0.16, lightness: 0.66 }, { '--bg':'oklch(0.17 0.020 282)','--canvas':'oklch(0.135 0.028 282)','--surface':'oklch(0.245 0.026 282)','--surface-2':'oklch(0.205 0.024 282)','--hairline':'oklch(0.33 0.028 282)','--hairline-strong':'oklch(0.46 0.040 282)','--ink':'oklch(0.94 0.010 282)','--ink-soft':'oklch(0.76 0.014 282)','--ink-faint':'oklch(0.58 0.018 282)' }),
  perplexity: mood('dark', { hue: 190, chroma: 0.13, lightness: 0.67 }, { '--bg':'oklch(0.18 0.014 198)','--canvas':'oklch(0.145 0.018 198)','--surface':'oklch(0.245 0.016 198)','--surface-2':'oklch(0.205 0.017 198)','--hairline':'oklch(0.33 0.020 198)','--hairline-strong':'oklch(0.45 0.032 198)','--ink':'oklch(0.95 0.006 198)','--ink-soft':'oklch(0.76 0.010 198)','--ink-faint':'oklch(0.58 0.014 198)' }),
  mistral: mood('light', { hue: 52, chroma: 0.16, lightness: 0.68 }, { '--bg':'oklch(0.965 0.020 80)','--canvas':'oklch(0.948 0.026 78)','--surface':'oklch(0.99 0.012 82)','--surface-2':'oklch(0.965 0.018 80)','--hairline':'oklch(0.84 0.025 78)','--hairline-strong':'oklch(0.70 0.035 72)','--ink':'oklch(0.24 0.028 52)','--ink-soft':'oklch(0.43 0.026 52)','--ink-faint':'oklch(0.62 0.020 52)' }),
  google: mood('light', { hue: 230, chroma: 0.18, lightness: 0.60 }, { '--bg':'oklch(0.965 0.030 232)','--canvas':'oklch(0.930 0.048 232)','--surface':'oklch(0.990 0.012 232)','--surface-2':'oklch(0.945 0.032 232)','--hairline':'oklch(0.800 0.045 232)','--hairline-strong':'oklch(0.660 0.070 232)','--ink':'oklch(0.225 0.050 250)','--ink-soft':'oklch(0.405 0.045 250)','--ink-faint':'oklch(0.585 0.040 250)','--window-title-bg':'linear-gradient(90deg, oklch(0.88 0.11 250 / 0.36), oklch(0.91 0.12 145 / 0.26), oklch(0.93 0.13 82 / 0.24), oklch(0.90 0.12 28 / 0.20))','--window-strip-bg':'linear-gradient(90deg, oklch(0.62 0.18 250) 0 25%, oklch(0.64 0.20 28) 25% 50%, oklch(0.84 0.16 85) 50% 75%, oklch(0.66 0.16 145) 75% 100%)','--window-strip-height':'5px' }),
  meta: mood('light', { hue: 245, chroma: 0.19, lightness: 0.58 }, { '--bg':'oklch(0.955 0.032 255)','--canvas':'oklch(0.915 0.060 255)','--surface':'oklch(0.985 0.016 255)','--surface-2':'oklch(0.940 0.042 255)','--hairline':'oklch(0.790 0.055 255)','--hairline-strong':'oklch(0.640 0.090 255)','--ink':'oklch(0.215 0.060 258)','--ink-soft':'oklch(0.405 0.050 258)','--ink-faint':'oklch(0.590 0.042 258)','--window-title-bg':'linear-gradient(90deg, oklch(0.78 0.15 245 / 0.34), oklch(0.88 0.11 205 / 0.28))','--window-strip-bg':'linear-gradient(90deg, oklch(0.62 0.20 255), oklch(0.74 0.16 210), oklch(0.72 0.14 188))','--window-strip-height':'5px','--window-shadow':'0 1px 0 oklch(1 0 0 / 0.70) inset, 0 18px 42px -30px oklch(0.45 0.14 250 / 0.55)' }),
  microsoft: mood('light', { hue: 155, chroma: 0.15, lightness: 0.59 }, { '--bg':'oklch(0.960 0.030 190)','--canvas':'oklch(0.925 0.050 190)','--surface':'oklch(0.990 0.014 190)','--surface-2':'oklch(0.940 0.035 190)','--hairline':'oklch(0.800 0.045 190)','--hairline-strong':'oklch(0.650 0.070 190)','--ink':'oklch(0.220 0.050 208)','--ink-soft':'oklch(0.410 0.042 208)','--ink-faint':'oklch(0.590 0.035 208)','--window-title-bg':'linear-gradient(90deg, oklch(0.86 0.13 145 / 0.28), oklch(0.86 0.12 230 / 0.24), oklch(0.90 0.12 65 / 0.16))','--window-strip-bg':'linear-gradient(90deg, oklch(0.62 0.18 25) 0 25%, oklch(0.70 0.17 145) 25% 50%, oklch(0.64 0.16 240) 50% 75%, oklch(0.83 0.16 82) 75% 100%)','--window-strip-height':'5px' }),
  apple: mood('light', { hue: 260, chroma: 0.04, lightness: 0.62 }, { '--bg':'oklch(0.960 0.006 265)','--canvas':'oklch(0.920 0.012 265)','--surface':'oklch(0.990 0.002 260 / 0.62)','--surface-2':'oklch(0.970 0.004 260 / 0.44)','--hairline':'oklch(0.820 0.006 260 / 0.68)','--hairline-strong':'oklch(0.620 0.006 260 / 0.72)','--ink':'oklch(0.205 0.004 260)','--ink-soft':'oklch(0.395 0.004 260)','--ink-faint':'oklch(0.590 0.004 260)','--window-bg':'linear-gradient(145deg, oklch(1 0 0 / 0.92), oklch(0.945 0.004 260 / 0.82))','--window-title-bg':'linear-gradient(180deg, oklch(1 0 0 / 0.70), oklch(0.90 0.004 260 / 0.34))','--window-title-backdrop':'blur(12px) saturate(1.25)','--window-radius':'16px','--window-shadow':'0 1px 0 oklch(1 0 0 / 0.78) inset, 0 18px 50px -28px oklch(0 0 0 / 0.42), 0 5px 18px -14px oklch(0 0 0 / 0.35)','--window-control-idle-opacity':'1','--window-extra-controls-display':'grid' }),
  // ── Terminal / hacker colorways — brand vibe rendered in our OKLCH family ──
  matrix: mood('dark', { hue: 150, chroma: 0.20, lightness: 0.80 }, { '--bg':'oklch(0.16 0.02 150)','--canvas':'oklch(0.13 0.025 150)','--surface':'oklch(0.20 0.022 150)','--surface-2':'oklch(0.175 0.022 150)','--hairline':'oklch(0.30 0.03 150)','--hairline-strong':'oklch(0.42 0.06 150)','--ink':'oklch(0.92 0.10 150)','--ink-soft':'oklch(0.75 0.12 150)','--ink-faint':'oklch(0.55 0.10 150)','--window-strip-bg':'linear-gradient(90deg, oklch(0.55 0.18 150), oklch(0.85 0.22 150))','--window-strip-height':'3px' }),
  synthwave: mood('dark', { hue: 330, chroma: 0.20, lightness: 0.66 }, { '--bg':'oklch(0.16 0.03 300)','--canvas':'oklch(0.13 0.04 300)','--surface':'oklch(0.215 0.035 300)','--surface-2':'oklch(0.185 0.035 300)','--hairline':'oklch(0.32 0.05 300)','--hairline-strong':'oklch(0.45 0.10 320)','--ink':'oklch(0.93 0.02 320)','--ink-soft':'oklch(0.76 0.04 320)','--ink-faint':'oklch(0.58 0.06 320)','--window-strip-bg':'linear-gradient(90deg, oklch(0.70 0.22 330), oklch(0.78 0.15 200))','--window-strip-height':'4px' }),
  cyberpunk: mood('dark', { hue: 350, chroma: 0.21, lightness: 0.64 }, { '--bg':'oklch(0.15 0.02 340)','--canvas':'oklch(0.12 0.025 340)','--surface':'oklch(0.205 0.025 340)','--surface-2':'oklch(0.175 0.025 340)','--hairline':'oklch(0.30 0.04 340)','--hairline-strong':'oklch(0.44 0.10 340)','--ink':'oklch(0.93 0.02 200)','--ink-soft':'oklch(0.76 0.05 200)','--ink-faint':'oklch(0.58 0.06 340)','--window-strip-bg':'linear-gradient(90deg, oklch(0.66 0.24 350), oklch(0.80 0.15 200))','--window-strip-height':'4px' }),
  vaporwave: mood('dark', { hue: 340, chroma: 0.15, lightness: 0.74 }, { '--bg':'oklch(0.18 0.03 295)','--canvas':'oklch(0.15 0.035 295)','--surface':'oklch(0.235 0.03 295)','--surface-2':'oklch(0.205 0.03 295)','--hairline':'oklch(0.34 0.045 300)','--hairline-strong':'oklch(0.48 0.08 320)','--ink':'oklch(0.94 0.02 320)','--ink-soft':'oklch(0.78 0.04 320)','--ink-faint':'oklch(0.60 0.05 320)','--window-strip-bg':'linear-gradient(90deg, oklch(0.80 0.14 340), oklch(0.82 0.12 200))','--window-strip-height':'4px' }),
  tron: mood('dark', { hue: 205, chroma: 0.16, lightness: 0.74 }, { '--bg':'oklch(0.15 0.02 230)','--canvas':'oklch(0.12 0.025 230)','--surface':'oklch(0.205 0.022 230)','--surface-2':'oklch(0.175 0.022 230)','--hairline':'oklch(0.30 0.035 215)','--hairline-strong':'oklch(0.44 0.08 205)','--ink':'oklch(0.93 0.02 205)','--ink-soft':'oklch(0.76 0.05 205)','--ink-faint':'oklch(0.58 0.06 205)','--window-strip-bg':'linear-gradient(90deg, oklch(0.55 0.14 230), oklch(0.85 0.16 200))','--window-strip-height':'3px' }),
  hacker: mood('dark', { hue: 145, chroma: 0.22, lightness: 0.82 }, { '--bg':'oklch(0.13 0.005 150)','--canvas':'oklch(0.10 0.006 150)','--surface':'oklch(0.18 0.008 150)','--surface-2':'oklch(0.15 0.008 150)','--hairline':'oklch(0.28 0.02 150)','--hairline-strong':'oklch(0.40 0.06 145)','--ink':'oklch(0.90 0.14 145)','--ink-soft':'oklch(0.72 0.16 145)','--ink-faint':'oklch(0.52 0.12 145)','--window-strip-bg':'oklch(0.85 0.22 145)','--window-strip-height':'2px' }),
};

export const THEME_PRESETS = {
  moss:    { hue: 145, chroma: 0.11, lightness: 0.62 },
  sage:    { hue: 165, chroma: 0.08, lightness: 0.66 },
  ocean:   { hue: 220, chroma: 0.13, lightness: 0.60 },
  cobalt:  { hue: 250, chroma: 0.15, lightness: 0.58 },
  plum:    { hue: 310, chroma: 0.12, lightness: 0.58 },
  rose:    { hue: 10,  chroma: 0.15, lightness: 0.64 },
  amber:   { hue: 65,  chroma: 0.14, lightness: 0.70 },
  rust:    { hue: 35,  chroma: 0.14, lightness: 0.62 },
  // ── Platform / infra colorways (brand hue → our OKLCH accent) ──
  render:     { hue: 165, chroma: 0.12, lightness: 0.70 },
  vercel:     { hue: 250, chroma: 0.14, lightness: 0.60 },
  envoy:      { hue: 350, chroma: 0.18, lightness: 0.62 },
  kali:       { hue: 245, chroma: 0.13, lightness: 0.60 },
  arch:       { hue: 235, chroma: 0.13, lightness: 0.62 },
  jules:      { hue: 290, chroma: 0.17, lightness: 0.62 },
  cohere:     { hue: 268, chroma: 0.16, lightness: 0.58 },
  github:     { hue: 250, chroma: 0.03, lightness: 0.58 },
  gitlab:     { hue: 50,  chroma: 0.15, lightness: 0.66 },
  docker:     { hue: 245, chroma: 0.14, lightness: 0.62 },
  kubernetes: { hue: 258, chroma: 0.15, lightness: 0.58 },
  terraform:  { hue: 295, chroma: 0.16, lightness: 0.56 },
  netlify:    { hue: 185, chroma: 0.12, lightness: 0.70 },
  railway:    { hue: 285, chroma: 0.16, lightness: 0.62 },
  flyio:      { hue: 290, chroma: 0.15, lightness: 0.64 },
  cloudflare: { hue: 55,  chroma: 0.15, lightness: 0.68 },
  figma:      { hue: 35,  chroma: 0.16, lightness: 0.64 },
  canva:      { hue: 195, chroma: 0.13, lightness: 0.70 },
  blender:    { hue: 55,  chroma: 0.15, lightness: 0.67 },
  // ── Language stripe colorways ──
  python:     { hue: 245, chroma: 0.10, lightness: 0.60 },
  javascript: { hue: 100, chroma: 0.15, lightness: 0.80 },
  typescript: { hue: 250, chroma: 0.13, lightness: 0.58 },
  rustlang:   { hue: 32,  chroma: 0.15, lightness: 0.58 },
  golang:     { hue: 215, chroma: 0.12, lightness: 0.68 },
  java:       { hue: 60,  chroma: 0.15, lightness: 0.66 },
  csharp:     { hue: 285, chroma: 0.17, lightness: 0.54 },
  cpp:        { hue: 245, chroma: 0.13, lightness: 0.54 },
  ruby:       { hue: 28,  chroma: 0.16, lightness: 0.57 },
  swift:      { hue: 45,  chroma: 0.16, lightness: 0.68 },
  kotlin:     { hue: 290, chroma: 0.17, lightness: 0.62 },
  elixir:     { hue: 320, chroma: 0.10, lightness: 0.52 },
  bash:       { hue: 140, chroma: 0.15, lightness: 0.62 },
};

export const SURFACE_CONTROLS = [
  { label: 'App Backdrop', varName: '--bg', previewKey: 'bg', hint: 'Behind the board and windows' },
  { label: 'Board Canvas', varName: '--canvas', previewKey: 'canvas', hint: 'The dotted workspace area' },
  { label: 'Window Surface', varName: '--surface', previewKey: 'surface', hint: 'Main cards and windows' },
  { label: 'Soft Surface', varName: '--surface-2', previewKey: 'surface2', hint: 'Inputs, wells, secondary cards' },
  { label: 'Primary Text', varName: '--ink', previewKey: 'ink', hint: 'Main readable text' },
  { label: 'Soft Text', varName: '--ink-soft', previewKey: 'inkSoft', hint: 'Secondary labels and helper text' },
  { label: 'Hairline Border', varName: '--hairline', previewKey: 'hairline', hint: 'Subtle dividers and outlines' },
  { label: 'Strong Border', varName: '--hairline-strong', previewKey: 'hairlineStrong', hint: 'Active or heavier outlines' },
];

function loadTheme() {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    return raw ? { ...DEFAULT_THEME, ...JSON.parse(raw) } : { ...DEFAULT_THEME };
  } catch {
    return { ...DEFAULT_THEME };
  }
}

function saveTheme(t) {
  try { localStorage.setItem(THEME_KEY, JSON.stringify(t)); } catch {}
}

export function createId() {
  return globalThis.crypto?.randomUUID?.() || `preset_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function applyTheme(t) {
  const root = document.documentElement;
  root.style.setProperty('--accent-h', String(t.hue));
  root.style.setProperty('--accent-c', String(t.chroma));
  root.style.setProperty('--accent-l', String(t.lightness));
  root.style.setProperty('--app-font-scale', String(t.fontScale || 1.0));
  const mood = MOODS[t.mood] || MOODS.cream;
  root.setAttribute('data-theme', mood.mode);
  root.setAttribute('data-mood', t.mood);
  Object.entries(THEME_VAR_DEFAULTS).forEach(([k, v]) => root.style.setProperty(k, v));
  Object.entries(mood.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  Object.entries(t.customVars || {}).forEach(([k, v]) => {
    if (v) root.style.setProperty(k, v);
  });
}

const ThemeContext = React.createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = React.useState(loadTheme);
  React.useEffect(() => { applyTheme(theme); saveTheme(theme); }, [theme]);
  const setTheme = (patch) => setThemeState(prev => ({ ...prev, ...patch }));
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return React.useContext(ThemeContext); }

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function parseOklch(value) {
  const match = String(value || '').match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
  return match ? { l: +match[1], c: +match[2], h: +match[3] } : { l: 0.6, c: 0.05, h: 145 };
}

export function oklch({ l, c, h }) {
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${Math.round(h)})`;
}

export { ThemePanel } from './theme/ThemePanel.jsx';
