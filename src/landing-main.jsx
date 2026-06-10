import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { ThemeProvider } from './components/Theme.jsx';
import { Landing } from './components/Landing.jsx';

ReactDOM.createRoot(document.getElementById('app')).render(
  <ThemeProvider>
    <Landing />
  </ThemeProvider>
);
