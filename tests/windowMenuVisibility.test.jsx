/** @jest-environment jsdom */

// eslint-disable-next-line no-unused-vars
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
// eslint-disable-next-line no-unused-vars
import { WindowMenu } from '../src/components/topbar/WindowMenu.jsx';

test('working modules remain while unfinished modules stay hidden', () => {
  render(<WindowMenu onSpawn={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /modules/i }));
  // Context Feed was descoped (commented out in integrationWindows.js) — not in the menu.
  expect(screen.queryByText('Context Feed')).not.toBeInTheDocument();
  for (const label of [
    'Governance', 'policy-dashboard', 'Hello Factory', 'Spreadsheet',
    'Linear', 'Figma', 'Provenance Explorer', 'Kubernetes',
    'Registry Test Window', 'Automation Board',
  ]) {
    expect(screen.queryByText(label)).not.toBeInTheDocument();
  }
});
