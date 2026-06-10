import React from 'react';

function formatTime(d) {
  const day = d.toLocaleDateString(undefined, { weekday: 'short' });
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${date} · ${time}`;
}

export function Hud({ focusMode }) {
  const [time, setTime] = React.useState(formatTime(new Date()));
  React.useEffect(() => {
    const t = setInterval(() => setTime(formatTime(new Date())), 60_000);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{
      position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
      fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em',
      textTransform: 'uppercase', color: 'var(--ink-faint)', pointerEvents: 'none',
      opacity: focusMode ? 0 : 1, transition: 'opacity 0.4s'
    }}>
      {time}
    </div>
  );
}
