import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { ThemeProvider } from './components/Theme.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import App from './app.jsx';
import { createLogger } from './lib/logger.js';

const log = createLogger('boot');

// Catch-all so nothing fails silently in the browser console.
window.addEventListener('error', (e) => {
  log.error('uncaught error', { message: e.message, source: e.filename, line: e.lineno, col: e.colno });
});
window.addEventListener('unhandledrejection', (e) => {
  log.error('unhandled promise rejection', { reason: e.reason?.message || String(e.reason) });
});

log.info('app booting', { mode: import.meta.env?.MODE, dev: !!import.meta.env?.DEV });

ReactDOM.createRoot(document.getElementById('app')).render(
  <ErrorBoundary>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </ErrorBoundary>
);
