import React from 'react';

const I = (props) => {
  const { size = 16, stroke = 1.6, children, style, ...rest } = props;
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      {...rest}
    >
      {children}
    </svg>
  );
};

export const Icon = {
  NewAgent: (p) => <I {...p}><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c0.5-3 3-5 5.5-5s5 2 5.5 5"/><path d="M18.5 6v6M15.5 9h6"/></I>,
  NewWindow: (p) => <I {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><path d="M17 14.5v6M14 17.5h6"/></I>,
  NewWorkflow: (p) => <I {...p}><circle cx="5.5" cy="6" r="2.2"/><circle cx="18.5" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><path d="M7.5 7.2L10.5 16.5M16.5 7.2L13.5 16.5M7.5 6h9"/></I>,
  Folder: (p) => <I {...p}><path d="M3.5 7.5a2 2 0 0 1 2-2h3l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/></I>,
  Up: (p) => <I {...p}><path d="M12 18V6M6 12l6-6 6 6"/></I>,
  Down: (p) => <I {...p}><path d="M12 6v12M18 12l-6 6-6-6"/></I>,
  Gear: (p) => <I {...p}><circle cx="12" cy="12" r="2.8"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></I>,
  Close: (p) => <I {...p}><path d="M6 6l12 12M18 6L6 18"/></I>,
  Minimize: (p) => <I {...p}><path d="M5 12h14"/></I>,
  Maximize: (p) => <I {...p}><path d="M8 4H6a2 2 0 0 0-2 2v2M16 4h2a2 2 0 0 1 2 2v2M8 20H6a2 2 0 0 1-2-2v-2M16 20h2a2 2 0 0 0 2-2v-2"/></I>,
  Restore: (p) => <I {...p}><path d="M8 8V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-4M4 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"/></I>,
  Fullscreen: (p) => <I {...p}><path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4"/></I>,
  Send: (p) => <I {...p}><path d="M4 12l16-8-6 16-3-7-7-1z"/></I>,
  Plus: (p) => <I {...p}><path d="M12 5v14M5 12h14"/></I>,
  Check: (p) => <I {...p}><path d="M5 12l4.5 4.5L19 7"/></I>,
  ArrowAssign: (p) => <I {...p}><path d="M5 12h12M13 6l6 6-6 6"/></I>,
  Person: (p) => <I {...p}><circle cx="12" cy="9" r="3.2"/><path d="M5.5 19c0.6-3.4 3.5-5.5 6.5-5.5s5.9 2.1 6.5 5.5"/></I>,
  Bot: (p) => <I {...p}><rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 3v4M9 13v.5M15 13v.5"/></I>,
  Chat: (p) => <I {...p}><path d="M21 12c0 4.4-4 8-9 8-1.4 0-2.7-.2-3.9-.7L3 21l1.4-4.4C3.5 15.2 3 13.7 3 12c0-4.4 4-8 9-8s9 3.6 9 8z"/></I>,
  List: (p) => <I {...p}><path d="M9 6h11M9 12h11M9 18h11M4 6h.5M4 12h.5M4 18h.5"/></I>,
  Tools: (p) => <I {...p}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-2.4z"/></I>,
  Memory: (p) => <I {...p}><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3"/></I>,
  Group: (p) => <I {...p}><circle cx="9" cy="9" r="3"/><circle cx="17" cy="11" r="2.4"/><path d="M3 19c0.5-3 3-5 6-5s5.5 2 6 5M14 18c0.4-2 2-3.5 3.5-3.5s3 1 3.5 3"/></I>,
  Files: (p) => <I {...p}><path d="M7 3h8l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/></I>,
  Copy: (p) => <I {...p}><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M5 16H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></I>,
  Code: (p) => <I {...p}><path d="M8 9l-4 3 4 3"/><path d="M16 9l4 3-4 3"/><path d="M14 5l-4 14"/></I>,
  Terminal: (p) => <I {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3"/><path d="M12 15h5"/></I>,
  Plug: (p) => <I {...p}><path d="M9 2v6M15 2v6M6 8h12v2a6 6 0 0 1-6 6 6 6 0 0 1-6-6zM12 16v6"/></I>,
  Drag: (p) => <I {...p}><circle cx="9" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="15" cy="18" r="1.2"/></I>,
  Eye: (p) => <I {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></I>,
  Search: (p) => <I {...p}><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.3-4.3"/></I>,
  Calendar: (p) => <I {...p}><rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></I>,
  Music: (p) => <I {...p}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></I>,
  Video: (p) => <I {...p}><rect x="2" y="6" width="16" height="12" rx="2"/><path d="M18 10l4-2v8l-4-2"/></I>,
  Server: (p) => <I {...p}><rect x="2" y="4" width="20" height="6" rx="2"/><rect x="2" y="14" width="20" height="6" rx="2"/><path d="M6 7h.01M6 17h.01"/></I>,
  Play: (p) => <I {...p}><path d="M5 3l14 9-14 9z"/></I>,
  Edit: (p) => <I {...p}><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></I>,
  History: (p) => <I {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></I>,
  Alert: (p) => <I {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></I>,
  Info: (p) => <I {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></I>,
  Refresh: (p) => <I {...p}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M21 21v-5h-5"/></I>,
};

export function ImageIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4.5" width="18" height="15" rx="2"/><circle cx="9" cy="10.5" r="1.7"/><path d="M3 17.5l5-4 4 3 3-2 6 5"/>
    </svg>
  );
}

export function GenIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.7 4.6L18 9.4l-3.6 3 1 4.7L12 14.7l-3.4 2.4 1-4.7-3.6-3 4.3-1.8z"/>
    </svg>
  );
}
