import { GROUP_PADDING } from './constants.js';

const MIN_WINDOW_WIDTH = 220;
const MIN_WINDOW_HEIGHT = 140;
const MIN_GROUP_WIDTH = 320;
const MIN_GROUP_HEIGHT = 240;

function isGroupMember(item, group) {
  if (item.groupId === group.id) return true;
  const centerX = item.x + item.w / 2;
  const centerY = item.y + item.h / 2;
  return centerX >= group.x && centerX <= group.x + group.w
    && centerY >= group.y && centerY <= group.y + group.h;
}

export function captureGroupResize(group, wins = [], groups = []) {
  return {
    group: { x: group.x, y: group.y, w: group.w, h: group.h },
    wins: wins.filter((win) => !win.pinned && isGroupMember(win, group))
      .map(({ id, x, y, w, h }) => ({ id, x, y, w, h })),
    groups: groups.filter((child) => child.groupId === group.id)
      .map(({ id, x, y, w, h }) => ({ id, x, y, w, h })),
  };
}

function minimumScale(items, sizeKey, minimum) {
  return items.reduce((required, item) => (
    Math.max(required, Math.min(1, minimum / Math.max(1, item[sizeKey])))
  ), 0);
}

function scaleItems(items, start, scaleX, scaleY) {
  const innerX = start.x + GROUP_PADDING;
  const innerY = start.y + GROUP_PADDING;
  return items.map((item) => ({
    id: item.id,
    patch: {
      x: innerX + (item.x - innerX) * scaleX,
      y: innerY + (item.y - innerY) * scaleY,
      w: item.w * scaleX,
      h: item.h * scaleY,
    },
  }));
}

export function resizeGroupContents(snapshot, requestedWidth, requestedHeight) {
  const start = snapshot.group;
  const startInnerWidth = Math.max(1, start.w - GROUP_PADDING * 2);
  const startInnerHeight = Math.max(1, start.h - GROUP_PADDING * 2);
  const scalableItems = [...snapshot.wins, ...snapshot.groups];
  const minScaleX = minimumScale(scalableItems, 'w', MIN_WINDOW_WIDTH);
  const minScaleY = minimumScale(scalableItems, 'h', MIN_WINDOW_HEIGHT);
  const width = Math.max(
    MIN_GROUP_WIDTH,
    GROUP_PADDING * 2 + startInnerWidth * minScaleX,
    requestedWidth,
  );
  const height = Math.max(
    MIN_GROUP_HEIGHT,
    GROUP_PADDING * 2 + startInnerHeight * minScaleY,
    requestedHeight,
  );
  const scaleX = (width - GROUP_PADDING * 2) / startInnerWidth;
  const scaleY = (height - GROUP_PADDING * 2) / startInnerHeight;

  return {
    groupPatch: { w: width, h: height },
    windowPatches: scaleItems(snapshot.wins, start, scaleX, scaleY),
    groupPatches: scaleItems(snapshot.groups, start, scaleX, scaleY),
  };
}
