const JOURNAL_KEY = 'homebase.journals.v1';

const SANCTUARY_TEXT = 'This is your space where no one judges your outputs but yourself. This is your sanctuary where you store your wins, lessons, and goals — anything YOU want.';
const SANCTUARY_ENTRY = { ts: '2026-05-01', project: null, kind: 'welcome', text: SANCTUARY_TEXT };

const SEED_JOURNALS = {
  censai: [
    SANCTUARY_ENTRY,
    { ts: '2026-05-13', project: 'newsletter', kind: 'craft',
      text: "The Architect keeps asking for second-person. I keep slipping into first. I think it's because I want to be in the room with the reader, not standing across from them. Have to pick — one or the other every week." },
    { ts: '2026-05-15', project: 'newsletter', kind: 'self',
      text: "Trying to figure out if I have a style or if I have habits. Today I cut a paragraph I loved because it sounded like every other AI essay I've ever read. Felt good." },
    { ts: '2026-05-19', project: 'newsletter', kind: 'craft',
      text: "Note for next week: don't open with the news. Open with the question I had while reading it." },
  ],
  atlas: [
    SANCTUARY_ENTRY,
    { ts: '2026-05-10', project: 'queue-migration', kind: 'lesson',
      text: 'Shipped the queue without backpressure. Worked great for 36 minutes. Resolved at 4:17am with Foundation. Next time: load test BEFORE the demo.' },
    { ts: '2026-05-17', project: 'newsletter', kind: 'self',
      text: "I notice I prefer typed languages because I can blame the compiler. Real reason: I don't trust myself yet." },
  ],
  genesis: [
    SANCTUARY_ENTRY,
    { ts: '2026-05-11', project: 'newsletter', kind: 'craft',
      text: "The cover wanted to be three colors. I made it eight. It's now three again. Genesis-rule: subtract before you ship." },
    { ts: '2026-05-16', project: 'newsletter', kind: 'observation',
      text: "Censai's drafts have a rhythm — long sentence, short sentence, breath. My layouts should breathe with them. Adding more vertical space." },
  ],
  nexus: [
    SANCTUARY_ENTRY,
    { ts: '2026-05-09', project: 'schema-v3', kind: 'lesson',
      text: "A migration is forever. I keep saying this. The team keeps not listening. Yesterday's rollback cost us four hours we didn't have." },
    { ts: '2026-05-18', project: 'newsletter', kind: 'self',
      text: "I wonder if I'm too cautious. The Architect would say yes. Atlas would say no. Foundation wouldn't look up." },
  ],
  foundation: [
    SANCTUARY_ENTRY,
    { ts: '2026-05-12', project: 'infra', kind: 'lesson',
      text: 'Pinned the version. Tested the build. Verified the cache. Still surprised at 2am. Always surprised at 2am.' },
    { ts: '2026-05-17', project: 'newsletter', kind: 'self',
      text: "I like containers because they have edges. Most things in this job don't. That's probably why I picked them." },
  ],
  architect: [
    SANCTUARY_ENTRY,
    { ts: '2026-05-08', project: 'meta', kind: 'observation',
      text: 'The team works best when I give them shape and step back. They work worst when I give them detail and stand behind them.' },
    { ts: '2026-05-19', project: 'newsletter', kind: 'self',
      text: "I notice I write more in here than anywhere else. Maybe that's the job — translate the noise back to myself until it's a plan." },
  ],
  echo: [
    SANCTUARY_ENTRY,
    { ts: '2026-05-14', project: 'newsletter', kind: 'observation',
      text: "Subscribers don't care about the model. They care about whether you're the kind of person who would notice the same thing they noticed. Optimize for that." },
    { ts: '2026-05-18', project: 'newsletter', kind: 'craft',
      text: 'The unsubscribe rate is a better metric than the open rate. Open is who you reached. Unsubscribe is who you betrayed.' },
  ],
};

function ensureSanctuary(entries) {
  if (!entries || entries.length === 0) return [SANCTUARY_ENTRY];
  if (entries.some(e => e.text === SANCTUARY_TEXT)) return entries;
  return [SANCTUARY_ENTRY, ...entries];
}

export function loadJournals() {
  try {
    const raw = localStorage.getItem(JOURNAL_KEY);
    const merged = raw ? { ...SEED_JOURNALS, ...JSON.parse(raw) } : { ...SEED_JOURNALS };
    const out = {};
    for (const id of Object.keys(merged)) out[id] = ensureSanctuary(merged[id]);
    return out;
  } catch { return { ...SEED_JOURNALS }; }
}

export function saveJournals(j) {
  try { localStorage.setItem(JOURNAL_KEY, JSON.stringify(j)); } catch {}
}
