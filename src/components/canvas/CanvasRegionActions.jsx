import React from 'react';
import { DEFAULT_CODE_EDITOR, DEFAULT_HTML_PREVIEW } from './CanvasState.js';
import { findRegionNeighbor } from './CanvasInteractions.js';
import { RegionMenu } from './CanvasRegionMenu.jsx';

export function CanvasRegionActions({
  region,
  zoom,
  wins,
  setRegion,
  onRubberBand,
  onSpawn,
  onSpawnGroup,
  onRequestNewAgent,
  onCapture,
}) {
  if (!region) return null;

  const spawnIntoRegion = (kind, data = {}, size = {}) => {
    onSpawn(kind, data, { x: region.x, y: region.y }, { w: size.w ?? region.w, h: size.h ?? region.h });
    setRegion(null);
  };

  return (
    <RegionMenu
      rect={region}
      zoom={zoom}
      neighbor={findRegionNeighbor(region, wins)}
      onFitNeighbor={(fitted) => setRegion(fitted)}
      onCancel={() => setRegion(null)}
      onPickPlan={() => { onRubberBand?.(region); setRegion(null); }}
      onPickIdea={() => spawnIntoRegion('idea', {}, { w: Math.max(320, region.w), h: Math.max(240, region.h) })}
      onPickGroup={() => { onSpawnGroup({ x: region.x, y: region.y }, { w: region.w, h: region.h }); setRegion(null); }}
      onPickChat={(agentId) => spawnIntoRegion('chat', { agentId })}
      onPickGroupChat={() => spawnIntoRegion('groupChat', {}, { w: Math.max(420, region.w), h: Math.max(540, region.h) })}
      onPickWorkflow={() => spawnIntoRegion('workflow')}
      onPickCodeEditor={() => spawnIntoRegion('code_editor', { title: 'Code Editor', code: DEFAULT_CODE_EDITOR }, { w: Math.max(420, region.w), h: Math.max(300, region.h) })}
      onPickHtmlPreview={() => spawnIntoRegion('htmlPreview', { title: 'HTML Preview', fileName: 'preview.html', html: DEFAULT_HTML_PREVIEW }, { w: Math.max(520, region.w), h: Math.max(360, region.h) })}
      onPickAgent={() => { onRequestNewAgent?.(); setRegion(null); }}
      onPickImage={() => spawnIntoRegion('genImage', {}, { w: Math.max(360, region.w), h: Math.max(300, region.h) })}
      onPickBrowser={() => spawnIntoRegion('browser', {}, { w: Math.max(400, region.w), h: Math.max(300, region.h) })}
      onPickFiles={() => spawnIntoRegion('files', {}, { w: Math.max(300, region.w), h: Math.max(400, region.h) })}
      onPickCalendar={() => spawnIntoRegion('calendar', {}, { w: Math.max(320, region.w), h: Math.max(300, region.h) })}
      onPickScheduler={() => spawnIntoRegion('scheduler', {}, { w: Math.max(760, region.w), h: Math.max(560, region.h) })}
      onPickOperations={() => spawnIntoRegion('operationsBoard', {}, { w: Math.max(900, region.w), h: Math.max(620, region.h) })}
      onPickMusic={() => spawnIntoRegion('music', {}, { w: Math.max(320, region.w), h: Math.max(380, region.h) })}
      onPickStream={() => spawnIntoRegion('stream', {}, { w: Math.max(480, region.w), h: Math.max(320, region.h) })}
      onPickExoSkeleton={() => spawnIntoRegion('exoSkeleton', {}, { w: Math.max(700, region.w), h: Math.max(500, region.h) })}
      onPickOverseer={() => spawnIntoRegion('overseer', {}, { w: Math.max(560, region.w), h: Math.max(460, region.h) })}
      onShare={() => onCapture((dataUrl, rect) => {
        onSpawn('chat', { agentId: 'censai', imageAttachment: dataUrl }, { x: rect.x + rect.w + 40, y: rect.y });
      })}
      onDownload={() => onCapture((dataUrl) => {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `censaihub_snapshot_${new Date().getTime()}.png`;
        a.click();
      })}
    />
  );
}
