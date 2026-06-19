import { isPointInRect } from '../../lib/canvasMath.js';

const REGION_NEIGHBOR_SNAP = 30;

export function getSvgPathFromStroke(pts) {
  if (!pts || pts.length === 0) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i += 1) d += ` L ${pts[i].x} ${pts[i].y}`;
  return d;
}

export function hasCanvasUiAncestor(target, stopAt) {
  let node = target;
  while (node && node !== stopAt) {
    if (node.nodeType === Node.ELEMENT_NODE && node.hasAttribute?.('data-canvas-ui')) return true;
    node = node.parentNode;
  }
  return false;
}

export function findRegionNeighbor(rect, wins) {
  let best = null;
  for (const win of wins.filter(w => !w.pinned)) {
    const verticalOverlap = overlapAmount(rect.y, rect.y + rect.h, win.y, win.y + win.h);
    const horizontalOverlap = overlapAmount(rect.x, rect.x + rect.w, win.x, win.x + win.w);
    const candidates = buildNeighborCandidates(rect, win, verticalOverlap, horizontalOverlap);
    for (const candidate of candidates) {
      if (candidate.gap > REGION_NEIGHBOR_SNAP || candidate.overlap <= 0) continue;
      if (!best || candidate.gap < best.gap) best = { ...candidate, win };
    }
  }
  return best;
}

export function basenameFromPath(filePath = '') {
  const parts = String(filePath).split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] || 'workspace';
}

export function windowInsideGroup(win, group) {
  const center = { x: win.x + win.w / 2, y: win.y + win.h / 2 };
  return isPointInRect(center.x, center.y, group.x, group.y, group.w, group.h);
}

export function windowsInSelection(wins, rect) {
  return wins.filter((win) => {
    if (win.pinned) return false;
    const centerX = win.x + win.w / 2;
    const centerY = win.y + win.h / 2;
    return isPointInRect(centerX, centerY, rect.x, rect.y, rect.w, rect.h);
  }).map((win) => win.id);
}

export function snapStrokeToRectangle(points) {
  if (!points || points.length < 6) return null;
  const cornerFit = extractRectangleCorners(points);
  if (cornerFit) return cornerFit;

  const centroid = averagePoint(points);
  const covariance = points.reduce((acc, point) => {
    const dx = point.x - centroid.x;
    const dy = point.y - centroid.y;
    acc.xx += dx * dx;
    acc.yy += dy * dy;
    acc.xy += dx * dy;
    return acc;
  }, { xx: 0, yy: 0, xy: 0 });

  return snapProjectedRectangle(points, centroid, covariance);
}

function overlapAmount(aStart, aEnd, bStart, bEnd) {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart));
}

function buildNeighborCandidates(rect, win, verticalOverlap, horizontalOverlap) {
  return [
    { side: 'left', gap: Math.abs((rect.x + rect.w) - win.x), overlap: verticalOverlap, fitted: { x: win.x - win.w, y: win.y, w: win.w, h: win.h } },
    { side: 'right', gap: Math.abs(rect.x - (win.x + win.w)), overlap: verticalOverlap, fitted: { x: win.x + win.w, y: win.y, w: win.w, h: win.h } },
    { side: 'top', gap: Math.abs((rect.y + rect.h) - win.y), overlap: horizontalOverlap, fitted: { x: win.x, y: win.y - win.h, w: win.w, h: win.h } },
    { side: 'bottom', gap: Math.abs(rect.y - (win.y + win.h)), overlap: horizontalOverlap, fitted: { x: win.x, y: win.y + win.h, w: win.w, h: win.h } },
  ];
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function averagePoint(points) {
  const total = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return { x: total.x / points.length, y: total.y / points.length };
}

function signedArea(points) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    area += (a.x * b.y) - (b.x * a.y);
  }
  return area / 2;
}

function curvatureAt(points, index) {
  const prev = points[Math.max(0, index - 1)];
  const current = points[index];
  const next = points[Math.min(points.length - 1, index + 1)];
  const v1x = current.x - prev.x;
  const v1y = current.y - prev.y;
  const v2x = next.x - current.x;
  const v2y = next.y - current.y;
  const len1 = Math.hypot(v1x, v1y);
  const len2 = Math.hypot(v2x, v2y);
  if (len1 < 1 || len2 < 1) return 0;
  return Math.PI - Math.acos(clamp(((v1x * v2x) + (v1y * v2y)) / (len1 * len2), -1, 1));
}

function extractRectangleCorners(points) {
  if (points.length < 8) return null;
  const bounds = points.reduce((acc, point) => ({
    minX: Math.min(acc.minX, point.x),
    minY: Math.min(acc.minY, point.y),
    maxX: Math.max(acc.maxX, point.x),
    maxY: Math.max(acc.maxY, point.y),
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const diagonal = Math.hypot(width, height);
  if (width < 24 || height < 24 || diagonal < 40) return null;
  if (Math.hypot(points[0].x - points.at(-1).x, points[0].y - points.at(-1).y) > Math.max(24, diagonal * 0.28)) return null;

  const selected = pickCornerCandidates(points);
  if (selected.length < 4) return null;
  const corners = selected.sort((a, b) => a.index - b.index).map(({ index }) => averagePoint(points.slice(Math.max(0, index - 2), Math.min(points.length, index + 3))));
  const center = averagePoint(corners);
  corners.sort((a, b) => Math.atan2(a.y - center.y, a.x - center.x) - Math.atan2(b.y - center.y, b.x - center.x));
  const area = Math.abs(signedArea(corners));
  if (area < width * height * 0.15) return null;
  const averageEdge = corners.map((corner, index) => Math.hypot(corners[(index + 1) % corners.length].x - corner.x, corners[(index + 1) % corners.length].y - corner.y)).reduce((sum, edge) => sum + edge, 0) / corners.length;
  return averageEdge < 10 ? null : [...corners, corners[0]];
}

function pickCornerCandidates(points) {
  const scores = points.map((point, index) => {
    const prev = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    return { index, score: curvatureAt(points, index) * Math.hypot(next.x - prev.x, next.y - prev.y) };
  }).sort((a, b) => b.score - a.score);
  const minSpacing = Math.max(3, Math.floor(points.length / 10));
  const selected = [];
  for (const candidate of scores) {
    if (candidate.score <= 0) break;
    if (selected.some(item => Math.abs(item.index - candidate.index) < minSpacing || Math.abs(item.index - candidate.index) > points.length - minSpacing)) continue;
    selected.push(candidate);
    if (selected.length === 4) break;
  }
  return selected;
}

function snapProjectedRectangle(points, centroid, covariance) {
  const angle = 0.5 * Math.atan2(2 * covariance.xy, covariance.xx - covariance.yy);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const projected = points.map(point => ({ u: (point.x - centroid.x) * cos + (point.y - centroid.y) * sin, v: -(point.x - centroid.x) * sin + (point.y - centroid.y) * cos }));
  const minU = Math.min(...projected.map(point => point.u));
  const maxU = Math.max(...projected.map(point => point.u));
  const minV = Math.min(...projected.map(point => point.v));
  const maxV = Math.max(...projected.map(point => point.v));
  const width = maxU - minU;
  const height = maxV - minV;
  if (width < 24 || height < 24) return null;

  const pathLength = points.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0);
  const edgeDistanceSum = projected.reduce((sum, local) => sum + Math.min(Math.abs(local.u - minU), Math.abs(local.u - maxU), Math.abs(local.v - minV), Math.abs(local.v - maxV)), 0);
  if (edgeDistanceSum / points.length > Math.max(8, Math.min(width, height) * 0.12)) return null;
  const perimeterRatio = pathLength / (2 * (width + height));
  if (perimeterRatio < 0.6 || perimeterRatio > 2.2) return null;

  const corners = [
    { u: minU, v: minV }, { u: maxU, v: minV }, { u: maxU, v: maxV }, { u: minU, v: maxV },
  ].map(({ u, v }) => ({ x: centroid.x + (u * cos) - (v * sin), y: centroid.y + (u * sin) + (v * cos) }));
  return [...corners, corners[0]];
}
