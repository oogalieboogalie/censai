import React from 'react';

// Inline formatting: **bold**, *italic*, _italic_, `code`, [[wiki-link]]
export function renderInline(str, onCopyCode) {
  if (typeof str !== 'string') return str;
  const parts = str.split(/(\*\*.*?\*\*|\*.*?\*|_.*?_|`.*?`|\[\[.*?\]\])/g);
  return parts.map((part, j) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={j} style={{ fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) return <em key={j}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`')) {
      const codeText = part.slice(1, -1);
      if (onCopyCode) {
        return (
          <code
            key={j}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9em',
              background: 'var(--surface-2)',
              padding: '2px 4px',
              borderRadius: 4,
              color: 'var(--accent-ink)',
              position: 'relative',
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onCopyCode(codeText);
            }}
            title="Click to copy"
          >
            {codeText}
          </code>
        );
      }
      return <code key={j} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9em', background: 'var(--surface-2)', padding: '2px 4px', borderRadius: 4, color: 'var(--accent-ink)' }}>{codeText}</code>;
    }
    if (part.startsWith('[[') && part.endsWith(']]')) {
      const linkText = part.slice(2, -2);
      return (
        <span
          key={j}
          data-wiki-link={linkText}
          style={{ color: 'var(--accent-ink)', cursor: 'pointer', borderBottom: '1px dashed var(--accent-ink)', fontWeight: 500 }}
          title={`Link to ${linkText}`}
        >
          {linkText}
        </span>
      );
    }
    return part;
  });
}

// Block-level markdown: headings, lists, tables, code fences
// compact=true → slightly smaller headings for chat bubbles
// onCopyCode - optional callback for copying inline code snippets
export function renderMarkdown(text, { compact = false, onCopyCode = null } = {}) {
  if (!text || typeof text !== 'string') return text;

  const lines = text.split('\n');
  const result = [];
  let inCodeBlock = false;
  let codeLines = [];
  let codeLang = '';

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];

    // --- Fenced code blocks ---
    if (ln.trim().startsWith('```')) {
      if (inCodeBlock) {
        // Close code block
        result.push(
          <pre key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.5, background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 8, padding: '10px 12px', margin: '4px 0', overflowX: 'auto', whiteSpace: 'pre', color: 'var(--ink)' }}>
            <code>{codeLines.join('\n')}</code>
          </pre>
        );
        codeLines = [];
        codeLang = '';
        inCodeBlock = false;
      } else {
        // Open code block
        inCodeBlock = true;
        codeLang = ln.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(ln);
      continue;
    }

    // --- Empty line → spacer ---
    if (ln.trim() === '') { result.push(<div key={i} style={{ height: compact ? 4 : 8 }} />); continue; }

    let element = ln;
    let style = { color: 'var(--ink)' };

    // --- Headings ---
    if (/^###\s+/.test(ln)) {
      element = ln.replace(/^###\s+/, '');
      style = { fontFamily: 'var(--font-display)', fontSize: compact ? 13 : 14, fontWeight: 600, color: 'var(--ink)' };
    } else if (/^##\s+/.test(ln)) {
      element = ln.replace(/^##\s+/, '');
      style = { fontFamily: 'var(--font-display)', fontSize: compact ? 14 : 16, fontWeight: 600, color: 'var(--ink)', marginTop: compact ? 6 : 12 };
    } else if (/^#\s+/.test(ln)) {
      element = ln.replace(/^#\s+/, '');
      style = { fontFamily: 'var(--font-display)', fontSize: compact ? 15 : 22, fontWeight: 600, color: 'var(--ink)', marginTop: compact ? 4 : 16, marginBottom: compact ? 2 : 8 };
    // --- Signature/attribution ---
    } else if (/^—\s+/.test(ln)) {
      style = { color: 'var(--ink-faint)', fontStyle: 'italic' };
    // --- Unordered lists ---
    } else if (/^[-*]\s+/.test(ln)) {
      element = ln.replace(/^[-*]\s+/, '•  ');
      style = { paddingLeft: 16 };
    // --- Ordered lists ---
    } else if (/^\d+\.\s+/.test(ln)) {
      style = { paddingLeft: 16 };
    // --- Horizontal rule ---
    } else if (/^---+$/.test(ln.trim()) || /^\*\*\*+$/.test(ln.trim())) {
      result.push(<div key={i} style={{ height: 1, background: 'var(--hairline)', margin: '8px 0' }} />);
      continue;
    // --- Blockquotes ---
    } else if (/^>\s*/.test(ln)) {
      element = ln.replace(/^>\s*/, '');
      result.push(
        <div key={i} style={{ borderLeft: '3px solid var(--hairline-strong)', paddingLeft: 10, color: 'var(--ink-soft)', fontStyle: 'italic' }}>
          {renderInline(element, onCopyCode)}
        </div>
      );
      continue;
    // --- Tables ---
    } else if (/^\s*\|.*\|\s*$/.test(ln)) {
      if (/^\s*\|[-:| ]+\|\s*$/.test(ln)) {
        result.push(<div key={i} style={{ height: 1, background: 'var(--hairline)', margin: '4px 0' }} />);
      } else {
        const cells = ln.split('|').slice(1, -1).map(c => c.trim());
        result.push(
          <div key={i} style={{ display: 'flex', borderBottom: '1px solid var(--surface-2)', padding: '6px 0', fontSize: 13 }}>
            {cells.map((c, j) => <div key={j} style={{ flex: 1, padding: '0 8px' }}>{renderInline(c, onCopyCode)}</div>)}
          </div>
        );
      }
      continue;
    }

    // Process inline formatting
    if (typeof element === 'string') {
      element = renderInline(element, onCopyCode);
    }

    result.push(<div key={i} style={style}>{element}</div>);
  }

  // Handle unclosed code block
  if (inCodeBlock && codeLines.length > 0) {
    result.push(
      <pre key={`code-unclosed`} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.5, background: 'var(--surface-2)', border: '1px solid var(--hairline)', borderRadius: 8, padding: '10px 12px', margin: '4px 0', overflowX: 'auto', whiteSpace: 'pre', color: 'var(--ink)' }}>
        <code>{codeLines.join('\n')}</code>
      </pre>
    );
  }

  return result;
}
