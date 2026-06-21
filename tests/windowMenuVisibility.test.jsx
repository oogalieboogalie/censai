/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { WindowMenu } from '../src/components/topbar/WindowMenu.jsx';

test('working modules remain while unfinished modules stay hidden', () => {
  render(<WindowMenu onSpawn={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: /modules/i }));
  expect(screen.getByText('Context Feed')).toBeInTheDocument();
  for (const label of [
    'Governance', 'policy-dashboard', 'Hello Factory', 'Spreadsheet',
    'Linear', 'Figma', 'Provenance Explorer', 'Kubernetes',
    'Registry Test Window', 'Automation Board',
  ]) {
    expect(screen.queryByText(label)).not.toBeInTheDocument();
  }
});
