import { create } from 'zustand';
import { DEFAULT_GROUPS } from '../components/Dock.jsx';

export const useWorkspaceStore = create((set, get) => ({
  wins: [],
  setWins: (wins) => set({ wins: typeof wins === 'function' ? wins(get().wins) : wins }),

  canvasGroups: [],
  setCanvasGroups: (groups) => set({ canvasGroups: typeof groups === 'function' ? groups(get().canvasGroups) : groups }),

  paths: [],
  setPaths: (paths) => set({ paths: typeof paths === 'function' ? paths(get().paths) : paths }),

  links: [],
  setLinks: (links) => set({ links: typeof links === 'function' ? links(get().links) : links }),

  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool }),

  penColor: '#60A5FA',
  setPenColor: (color) => set({ penColor: color }),

  penSize: 4,
  setPenSize: (size) => set({ penSize: size }),

  penMode: false,
  setPenMode: (mode) => set({ penMode: mode }),

  activeId: null,
  setActiveId: (id) => set({ activeId: id }),

  dockOffset: 0,
  setDockOffset: (offset) => set({ dockOffset: typeof offset === 'function' ? offset(get().dockOffset) : offset }),

  groups: DEFAULT_GROUPS,
  setGroups: (groups) => set({ groups: typeof groups === 'function' ? groups(get().groups) : groups }),

  settingsOpen: false,
  setSettingsOpen: (open) => set({ settingsOpen: open }),

  focusMode: false,
  setFocusMode: (mode) => set({ focusMode: mode }),

  extraAgents: [],
  setExtraAgents: (agents) => set({ extraAgents: typeof agents === 'function' ? agents(get().extraAgents) : agents }),

  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),

  pan: { x: 0, y: 0 },
  setPan: (pan) => set({ pan: typeof pan === 'function' ? pan(get().pan) : pan }),

  zoom: 1,
  setZoom: (zoom) => set({ zoom: typeof zoom === 'function' ? zoom(get().zoom) : zoom }),

  presets: [],
  setPresets: (presets) => set({ presets: typeof presets === 'function' ? presets(get().presets) : presets }),
}));
