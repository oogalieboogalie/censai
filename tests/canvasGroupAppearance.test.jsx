/**
 * @jest-environment jsdom
 */
/* eslint-disable no-unused-vars */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { jest } from '@jest/globals';
import { CanvasGroup } from '../src/components/canvas/CanvasGroup.jsx';
import { getGroupInnerBounds, makeGroupBoundsForWindows } from '../src/lib/layoutAlgo.js';

describe('Canvas group appearance', () => {
  test('uses equal content padding on every side', () => {
    const win = { x: 100, y: 200, w: 320, h: 240 };
    const group = makeGroupBoundsForWindows([win]);
    const inner = getGroupInnerBounds(group);

    expect(group).toEqual({ x: 64, y: 160, w: 384, h: 304 });
    expect(inner.x - group.x).toBe(32);
    expect(inner.y - group.y).toBe(32);
    expect(group.x + group.w - (inner.x + inner.w)).toBe(32);
    expect(group.y + group.h - (inner.y + inner.h)).toBe(32);
  });

  test('persists a selected custom background color', () => {
    const onUpdate = jest.fn();
    const { container } = render(
      <CanvasGroup
        group={{
          id: 'test-group',
          label: 'Test Group',
          hue: 220,
          bgMode: 'custom',
          bgColor: '#123456',
          x: 10,
          y: 10,
          w: 400,
          h: 300,
        }}
        zoom={1}
        allWins={[]}
        onUpdate={onUpdate}
        onMove={jest.fn()}
      />
    );

    expect(container.querySelector('[data-group-id="test-group"]')).toHaveStyle({
      background: '#123456',
    });

    fireEvent.change(screen.getByLabelText('Group background color'), {
      target: { value: '#abcdef' },
    });

    expect(onUpdate).toHaveBeenCalledWith({
      bgColor: '#abcdef',
      bgMode: 'custom',
    });
  });
});
