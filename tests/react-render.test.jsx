/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { MailcowWindow } from '../src/components/MailcowWindow.jsx';
import { WindowFrame } from '../src/components/Windows.jsx';

describe('React Jest harness', () => {
  test('renders JSX in jsdom', () => {
    render(<section aria-label="Jest React Harness">ready</section>);

    expect(screen.getByLabelText('Jest React Harness')).toHaveTextContent('ready');
  });

  test('renders a real window frame with controls and attached-agent accent lookup', () => {
    render(
      React.createElement(
        WindowFrame,
        {
          win: {
            id: 'win-chat',
            kind: 'chat',
            x: 12,
            y: 18,
            w: 360,
            h: 420,
            attachedAgents: ['censai'],
          },
          onUpdate: jest.fn(),
          onClose: jest.fn(),
          onSelect: jest.fn(),
          isActive: true,
          allWins: [],
        },
        <div>Chat renderer mounted</div>
      )
    );

    expect(screen.getByText('Chat renderer mounted')).toBeInTheDocument();
    expect(screen.getByTitle('Close window')).toBeInTheDocument();
    expect(screen.getByTitle('Maximize window')).toBeInTheDocument();
    expect(screen.getByTitle('Pin to screen')).toBeInTheDocument();
  });

  test('renders the Mailcow setup state from the split hook and tab components', async () => {
    const fetchMock = jest.fn(async (url) => {
      if (url === '/api/mailcow/health') {
        return {
          ok: true,
          json: async () => ({ configured: false, ok: false }),
        };
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    global.fetch = fetchMock;

    render(
      React.createElement(MailcowWindow, {
        win: { id: 'mailcow', title: 'Mailcow' },
        onUpdate: jest.fn(),
      })
    );

    await waitFor(() => {
      expect(screen.getByText('Mailcow Not Configured')).toBeInTheDocument();
    });
    expect(screen.getByText(/MAILCOW_URL=https:\/\/mail\.censai\.app/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/mailcow/health');
  });
});
