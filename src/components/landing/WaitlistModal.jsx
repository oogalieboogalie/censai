import React from 'react';
import { N8N_FORM_URL } from './landingModel.js';

export function WaitlistModal({ onClose }) {
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState('idle'); // idle | sending | ok | err
  const [errMsg, setErrMsg] = React.useState('');
  const inputRef = React.useRef(null);

  React.useEffect(() => { setTimeout(() => inputRef.current?.focus(), 30); }, []);

  const submit = async (e) => {
    e?.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus('err');
      setErrMsg('That email doesn\'t look right.');
      return;
    }
    setStatus('sending');
    setErrMsg('');
    // Always mirror locally first so we never lose a signup if the network blips
    try { localStorage.setItem('homebase.waitlist.email', trimmed); } catch {}

    if (!N8N_FORM_URL) {
      // Dev fallback — show success but log clearly so it's not silent
      console.warn('[Homebase waitlist] N8N_FORM_URL is unset. Captured locally:', trimmed);
      setStatus('ok');
      return;
    }

    try {
      // n8n Form Trigger expects multipart/form-data
      const formData = new FormData();
      formData.append('Email Address', trimmed);
      
      const res = await fetch(N8N_FORM_URL, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(`Form returned ${res.status}`);
      setStatus('ok');
    } catch (e) {
      setStatus('err');
      setErrMsg('Couldn\'t reach the waitlist — your email was saved locally, please try again in a moment.');
    }
  };

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.32)', backdropFilter: 'blur(6px)',
        zIndex: 200, animation: 'wl-bg 0.25s ease both',
      }} />
      <style>{`
        @keyframes wl-bg { from { opacity: 0 } to { opacity: 1 } }
        @keyframes wl-pop { from { opacity: 0; transform: translate(-50%,-48%) scale(0.97) } to { opacity: 1; transform: translate(-50%,-50%) scale(1) } }
      `}</style>
      <div role="dialog" style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 210, width: 440, maxWidth: 'calc(100vw - 32px)',
        background: 'var(--surface)', border: '1px solid var(--hairline)',
        borderRadius: 20, padding: 28,
        boxShadow: 'var(--shadow-pop)',
        animation: 'wl-pop 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
            join the waitlist
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ all: 'unset', cursor: 'pointer', color: 'var(--ink-faint)' }}>
            <Icon.Close size={14} />
          </button>
        </div>

        {status === 'ok' ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 26, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 10 }}>
              You're on the list.
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--ink-soft)', marginBottom: 20 }}>
              We'll email you when the next batch of invites goes out. In the meantime: this canvas is the demo — keep playing with it.
            </div>
            <button onClick={onClose} style={{
              all: 'unset', cursor: 'pointer',
              background: 'var(--accent-soft)', color: 'var(--accent-ink)',
              padding: '9px 18px', borderRadius: 999,
              fontWeight: 600, fontSize: 13,
            }}>Back to the canvas</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 24, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 8, lineHeight: 1.2 }}>
              Get an invite when the beta opens.
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink-soft)', marginBottom: 18 }}>
              We're letting people in slowly. Drop your email and you're on the list — that's it.
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink-faint)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>email</span>
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@somewhere.com"
                style={inputStyle}
              />
            </label>
            {status === 'err' && (
              <div style={{ fontSize: 12, color: 'oklch(0.55 0.18 25)', marginBottom: 12, background: 'oklch(0.96 0.04 25 / 0.5)', padding: '8px 10px', borderRadius: 8, lineHeight: 1.4 }}>
                {errMsg}
              </div>
            )}
            <button
              type="submit"
              disabled={status === 'sending'}
              style={{
                all: 'unset', cursor: status === 'sending' ? 'wait' : 'pointer',
                width: '100%', boxSizing: 'border-box',
                background: 'var(--accent)', color: 'white',
                padding: '12px 18px', borderRadius: 999,
                fontWeight: 600, fontSize: 14, textAlign: 'center',
                opacity: status === 'sending' ? 0.7 : 1,
                boxShadow: '0 4px 14px oklch(var(--accent-l) calc(var(--accent-c) * 0.8) var(--accent-h) / 0.35), 0 1px 0 oklch(1 0 0 / 0.3) inset',
              }}>
              {status === 'sending' ? 'Sending…' : 'Save my spot →'}
            </button>
            <div style={{ marginTop: 12, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.06em', textAlign: 'center' }}>
              no spam, no marketing list, just the invite
            </div>
          </form>
        )}
      </div>
    </>
  );
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  border: '1px solid var(--hairline)', background: 'var(--surface-2)',
  borderRadius: 10, padding: '10px 12px',
  font: '14px/1.4 var(--font-sans)', color: 'var(--ink)',
  outline: 'none', transition: 'border-color 0.15s',
};

