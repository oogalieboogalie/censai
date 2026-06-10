// Shared style constants for AgentDesignerWindow

export const shellStyle = { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#0b1020', color: '#e2e8f0', overflow: 'hidden' };
export const topBarStyle = { height: 52, flex: '0 0 auto', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 14, padding: '0 16px', background: '#18181b', borderBottom: '1px solid #27272a' };
export const brandStyle = { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 };
export const bodyStyle = { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' };
export const flowStyle = { position: 'relative', minHeight: 0, overflow: 'hidden', background: '#22252a' };
export const flowGridStyle = { position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.22) 1px, transparent 1px)', backgroundSize: '8px 8px' };
export const detailsStyle = { display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, minHeight: 0, overflowY: 'auto', padding: '24px 16px', background: '#111111' };
export const formContainerStyle = { maxWidth: 640, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 };
export const panelHeaderStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: '#f8fafc' };
export const darkInputStyle = { width: '100%', boxSizing: 'border-box', border: '1px solid #64748b', background: '#111111', borderRadius: 10, padding: '9px 11px', font: '13px/1.35 var(--font-sans)', color: '#e2e8f0', outline: 'none' };
export const primaryBtnStyle = { all: 'unset', justifySelf: 'end', cursor: 'pointer', padding: '9px 16px', borderRadius: 999, background: '#0369a1', color: 'white', fontSize: 12, fontWeight: 850, border: '1px solid #38bdf8' };
export const segmentedStyle = { display: 'flex', padding: 2, borderRadius: 999, border: '1px solid #e2e8f0', background: '#111111' };
export const segmentStyle = { all: 'unset', cursor: 'pointer', minWidth: 78, textAlign: 'center', padding: '7px 14px', borderRadius: 999, fontSize: 12, fontWeight: 850 };
export const sectionTitleStyle = { fontSize: 12, fontWeight: 850, color: '#f8fafc', borderTop: '1px solid #334155', paddingTop: 10 };
export const chipBoxStyle = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 7, minHeight: 66, padding: 10, borderRadius: 10, border: '1px solid #64748b', background: '#151515' };
export const selectedChipStyle = { all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7, maxWidth: '100%', padding: '6px 8px', borderRadius: 8, background: '#1f2937', color: '#f8fafc', fontSize: 12, fontWeight: 750, border: '1px solid #475569' };
export const toolSearchStyle = { flex: '1 1 150px', minWidth: 120, border: 0, outline: 0, background: 'transparent', color: '#e2e8f0', font: '13px var(--font-sans)' };
export const catalogStyle = { display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 260, overflowY: 'auto', paddingRight: 3 };
export const categoryTitleStyle = { marginBottom: 6, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 850 };
export const toolGridStyle = { display: 'grid', gridTemplateColumns: '1fr', gap: 6 };
export const toolButtonStyle = { all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, padding: '8px 9px', borderRadius: 8, border: '1px solid #334155', color: '#e2e8f0', fontSize: 12, fontWeight: 750 };
export const scopeStyle = { display: 'flex', flexDirection: 'column', gap: 10, padding: 10, border: '1px solid #334155', borderRadius: 10, background: '#151515' };
export const listStyle = { display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 142, overflowY: 'auto', paddingRight: 2 };
export const nodeStyle = { position: 'absolute', width: 186, minHeight: 112, borderRadius: 11, overflow: 'hidden', background: '#18181b', border: '1px solid #334155', boxShadow: '0 14px 40px rgba(0,0,0,0.28)' };
export const nodeHeaderStyle = { display: 'flex', alignItems: 'center', gap: 7, padding: '9px 12px', color: 'white', fontSize: 12, fontWeight: 850 };
export const nodeBodyStyle = { minHeight: 42, padding: '10px 12px', color: '#f8fafc', fontSize: 11, fontWeight: 700, lineHeight: 1.35 };
export const nodeToolRowStyle = { display: 'flex', alignItems: 'center', gap: 5, padding: '0 12px 10px', minHeight: 20, fontSize: 10 };
export const canvasControlsStyle = { position: 'absolute', left: 14, bottom: 14, display: 'flex', flexDirection: 'column', gap: 6 };
export const miniBtnStyle = { all: 'unset', cursor: 'pointer', width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: '#111827', color: '#f8fafc', border: '1px solid #334155', fontWeight: 850 };
export const connectorStyle = { position: 'absolute', left: '29%', right: '20%', top: '49%', height: 70, borderTop: '1px dashed #94a3b8', borderLeft: '1px dashed #94a3b8', borderRight: '1px dashed #94a3b8', borderRadius: '52% 52% 0 0', opacity: 0.7 };
export const parentBadgeStyle = { position: 'absolute', left: 16, top: 16, display: 'flex', alignItems: 'center', gap: 7, padding: '7px 9px', borderRadius: 999, background: '#111827', color: '#e2e8f0', border: '1px solid #334155', fontSize: 12, fontWeight: 800 };

export function dotStyle(category) {
  const hue = category === 'GitHub' ? 215 : category === 'Research' ? 20 : category === 'Project' ? 145 : category === 'Ops' ? 35 : category === 'Database' ? 280 : 190;
  return { width: 9, height: 9, borderRadius: 999, flex: '0 0 auto', background: `oklch(0.68 0.16 ${hue})` };
}

export function nodeToolDotStyle(category) {
  return { ...dotStyle(category), width: 18, height: 18, boxShadow: 'inset 0 0 0 4px #111827' };
}
