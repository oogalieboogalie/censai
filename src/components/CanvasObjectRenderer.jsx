import React from 'react';
import { getCanvasObjectRenderer, GenericCanvasObjectWindow } from '../lib/canvasObjectRegistry.jsx';
import { getCanvasObjectType, legacyKindForCanvasType } from '../lib/canvasObjectTypes.js';

export const CanvasObjectRenderer = React.memo(({
  canvasObject,
  onUpdate,
  ...rendererProps
}) => {
  if (!canvasObject) {
    return <GenericCanvasObjectWindow canvasObject={{ type: 'missing' }} />;
  }

  const Renderer = getCanvasObjectRenderer(canvasObject);
  const type = getCanvasObjectType(canvasObject);
  const win = {
    ...canvasObject,
    kind: canvasObject.kind || legacyKindForCanvasType(type),
    w: Number.isFinite(canvasObject.w) ? canvasObject.w : canvasObject.width,
    h: Number.isFinite(canvasObject.h) ? canvasObject.h : canvasObject.height,
  };

  return (
    <Renderer
      {...rendererProps}
      canvasObject={canvasObject}
      win={win}
      type={type}
      onUpdate={onUpdate}
    />
  );
});

export default CanvasObjectRenderer;
