import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Canvas } from './Canvas.jsx';
import { AGENT_LINE } from '../data/landing-chat-script.js';
import { LandingChrome } from './landing/LandingChrome.jsx';
import { MockFileExplorer } from './landing/LandingFileExplorer.jsx';
import { LandingHero } from './landing/LandingHero.jsx';
import { ProgressFeed as LandingProgress } from './landing/LandingProgress.jsx';
import { Toolbar as LandingToolbar } from './landing/LandingToolbar.jsx';
import { Tour as LandingTour } from './landing/LandingTour.jsx';
import { WaitlistModal } from './landing/WaitlistModal.jsx';
import { DEFAULT_SIZES, makeDemoWindows, randomDropSpot } from './landing/landingModel.js';
export function Landing() {
  const [wins, setWins] = React.useState(() => makeDemoWindows());
  const [canvasGroups, setCanvasGroups] = React.useState([]);
  const [paths, setPaths] = React.useState([]);
  const [activeId, setActive] = React.useState(null);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [heroOpen, setHeroOpen] = React.useState(true);
  const [tourStep, setTourStep] = React.useState(0); // 0 hidden, 1 drag-prompt, 2 success, 3 invite-cta
  const [waitlistOpen, setWaitlistOpen] = React.useState(false);
  const [activeTool, setActiveTool] = React.useState('select');
  const [penColor, setPenColor] = React.useState('#DC2626');
  const [penSize, setPenSize] = React.useState(4);
  const panRef = React.useRef(pan);
  const zoomRef = React.useRef(zoom);
  const canvasGroupsRef = React.useRef(canvasGroups);
  React.useEffect(() => { canvasGroupsRef.current = canvasGroups; }, [canvasGroups]);
  const groupDragCacheRef = React.useRef(null);
  React.useEffect(() => { panRef.current = pan; }, [pan]);
  React.useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  const spawnAt = (kind, props = {}, pos = null, size = null) => {
    const id = crypto.randomUUID();
    const sz = size || DEFAULT_SIZES[kind] || { w: 360, h: 320 };
    const p = pos || randomDropSpot(sz, panRef.current, zoomRef.current);
    let extra = {};
    if (kind === 'chat' || kind === 'groupChat') {
      kind = 'chat';
      extra = {
        demoMode: true,
        agentId: 'censai',
        msgs: [
          { from: 'me', text: 'hello' },
          { from: 'agent', text: AGENT_LINE },
        ],
      };
    }
    const win = { id, kind, x: p.x, y: p.y, w: sz.w, h: sz.h, ...props, ...extra };
    setWins(prev => [...prev, win]);
    setActive(id);
    setTourStep(s => (s === 1 ? 2 : s));
    return id;
  };
  const spawnGroup = (pos, size) => {
    const id = crypto.randomUUID();
    const hue = Math.floor(Math.random() * 360);
    setCanvasGroups(prev => [...prev, { id, label: 'New Group', hue, x: pos.x, y: pos.y, w: size.w, h: size.h }]);
    setTourStep(s => (s === 1 ? 2 : s));
    return id;
  };
  const onUpdate = (id, patch) => setWins(prev => prev.map(w => w.id === id ? { ...w, ...patch } : w));
  const onUpdateGroup = (id, patch) => setCanvasGroups(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));
  const onCloseGroup = (id) => setCanvasGroups(prev => prev.filter(g => g.id !== id));
  const onClose = (id) => {
    setWins(prev => prev.filter(w => w.id !== id));
    if (activeId === id) setActive(null);
  };
  React.useEffect(() => {
    if (tourStep === 2) {
      const t = setTimeout(() => setTourStep(3), 2200);
      return () => clearTimeout(t);
    }
  }, [tourStep]);
  const startDemo = () => {
    setHeroOpen(false);
    setTourStep(1);
  };
  const skipToWaitlist = () => {
    setHeroOpen(false);
    setTourStep(3);
    setWaitlistOpen(true);
  };
  return (
    <div style={{
      '--canvas': 'oklch(0.965 0.003 260)',
      '--surface': 'oklch(0.995 0 0)',
      '--surface-2': 'oklch(0.96 0.004 260)',
      '--hairline': 'oklch(0.86 0.006 260)',
      '--hairline-strong': 'oklch(0.70 0.008 260)',
      '--ink': 'oklch(0.16 0.008 260)',
      '--ink-soft': 'oklch(0.38 0.008 260)',
      '--ink-faint': 'oklch(0.58 0.006 260)',
      '--accent-h': 25,
      '--accent-c': 0.20,
      '--accent-l': 0.50,
      '--accent': 'oklch(0.50 0.20 25)',
      '--accent-soft': 'oklch(0.94 0.035 25)',
      '--accent-ink': 'oklch(0.42 0.16 25)',
    }}>
      <div
        id="canvas-root"
        style={{
          position: 'fixed',
          inset: 0,
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('text/x-homebase-file')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDrop={(e) => {
          const fileName = e.dataTransfer.getData('text/x-homebase-file');
          if (!fileName) return;
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const cx = (e.clientX - rect.left - panRef.current.x) / zoomRef.current - 200;
          const cy = (e.clientY - rect.top - panRef.current.y) / zoomRef.current - 30;
          spawnAt('doc', { fileName }, { x: cx, y: cy }, { w: 480, h: 380 });
        }}
      >
        <Canvas
          wins={wins} activeId={activeId}
          pan={pan} zoom={zoom}
          onPanZoom={({ panX, panY, zoom: z }) => { setPan({ x: panX, y: panY }); setZoom(z); }}
          onUpdate={onUpdate} onClose={onClose} onSelect={setActive}
          onSpawn={spawnAt}
          dockState={{ groups: [], offset: 0 }}
          canvasGroups={canvasGroups}
          onSpawnGroup={spawnGroup}
          onUpdateGroup={onUpdateGroup}
          onCloseGroup={onCloseGroup}
          onMoveGroup={(id, dx, dy, isFirstMove) => {
            const g = canvasGroups.find(x => x.id === id);
            if (!g) return;
            if (isFirstMove) {
              const enclosedWins = wins.filter(w => {
                const cx = w.x + w.w / 2;
                const cy = w.y + w.h / 2;
                return cx >= g.x && cx <= g.x + g.w && cy >= g.y && cy <= g.y + g.h;
              }).map(w => w.id);
              const enclosedGroups = canvasGroups.filter(otherG => {
                if (otherG.id === id) return false;
                const cx = otherG.x + otherG.w / 2;
                const cy = otherG.y + otherG.h / 2;
                return cx >= g.x && cx <= g.x + g.w && cy >= g.y && cy <= g.y + g.h;
              }).map(otherG => otherG.id);
              groupDragCacheRef.current = { enclosedWins, enclosedGroups };
            }
            onUpdateGroup(id, { x: g.x + dx, y: g.y + dy });
            const cache = groupDragCacheRef.current || { enclosedWins: [], enclosedGroups: [] };
            cache.enclosedWins.forEach(wId => {
              const w = wins.find(x => x.id === wId);
              if (w) onUpdate(wId, { x: w.x + dx, y: w.y + dy });
            });
            cache.enclosedGroups.forEach(gId => {
              const otherG = canvasGroups.find(x => x.id === gId);
              if (otherG) onUpdateGroup(gId, { x: otherG.x + dx, y: otherG.y + dy });
            });
          }}
          onRubberBand={(rect) => {
            spawnAt('todos', { title: 'Plan', items: [] }, { x: rect.x, y: rect.y }, { w: Math.max(260, rect.w), h: Math.max(180, rect.h) });
          }}
          paths={paths} setPaths={setPaths}
          activeTool={activeTool} penColor={penColor} penSize={penSize}
          onRequestNewAgent={() => {}}
          pinnedRailOffset={{ top: 72, left: 18 }}
          suppressEmptyState
        />
      </div>
      <LandingChrome onJoinClick={() => setWaitlistOpen(true)} />
      {heroOpen && <LandingHero onStart={startDemo} onSkip={skipToWaitlist} />}
      <LandingTour
        step={tourStep}
        onDismiss={() => setTourStep(0)}
        onWaitlist={() => { setTourStep(0); setWaitlistOpen(true); }}
      />
      <LandingProgress />
      <RoadmapTimeline />
      <MockFileExplorer />
      <LandingToolbar
        activeTool={activeTool} onSelectTool={setActiveTool}
        penColor={penColor} setPenColor={setPenColor}
        penSize={penSize} setPenSize={setPenSize}
      />
      {waitlistOpen && <WaitlistModal onClose={() => setWaitlistOpen(false)} />}
    </div>
  );
}
