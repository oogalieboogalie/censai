import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { ThemeProvider } from './components/Theme.jsx';
import { AutomationOfferPage } from './components/landing/AutomationOfferPage.jsx';

ReactDOM.createRoot(document.getElementById('app')).render(
  <ThemeProvider>
    <AutomationOfferPage />
  </ThemeProvider>
);
