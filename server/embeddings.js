import { getSecret } from './secrets.js';

const OPENAI_BASE_URL = () => (process.env.EMBEDDING_BASE_URL || process.env.AI_BASE_URL || 'http://localhost:11434/v1').replace(/\/+$/, '');
const COHERE_BASE_URL = () => (process.env.COHERE_BASE_URL || 'https://api.cohere.com').replace(/\/+$/, '');
const COHERE_KEY = () => getSecret('COHERE_API_KEY') || getSecret('EMBEDDING_API_KEY') || '';
const PROVIDER = () => (process.env.EMBEDDING_PROVIDER || '').toLowerCase();
const MODEL = () => {
  if (usesCohere()) return process.env.EMBEDDING_MODEL || 'embed-v4.0';
  return process.env.EMBEDDING_MODEL || 'nomic-embed-text';
};

let available = null;

function usesCohere() {
  const provider = PROVIDER();
  if (provider) return provider === 'cohere';
  return !!COHERE_KEY() && (process.env.EMBEDDING_MODEL || '').startsWith('embed-');
}

async function embedWithCohere(text, inputType) {
  const apiKey = COHERE_KEY();
  if (!apiKey) {
    console.warn('Cohere embeddings unavailable: set COHERE_API_KEY in .env.');
    available = false;
    return null;
  }

  const body = {
    model: MODEL(),
    texts: [text],
    input_type: inputType,
    embedding_types: ['float'],
    truncate: 'END',
  };

  const outputDimension = Number.parseInt(process.env.COHERE_EMBEDDING_DIMENSION || '', 10);
  if (Number.isFinite(outputDimension)) body.output_dimension = outputDimension;

  const res = await fetch(`${COHERE_BASE_URL()}/v2/embed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-Client-Name': 'censai',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.warn(`Cohere embeddings failed (${res.status}): ${errText}. Will retry later.`);
    if ([401, 403, 498].includes(res.status)) available = false;
    return null;
  }

  const data = await res.json();
  return data.embeddings?.float?.[0] || data.embeddings?.[0] || null;
}

async function embedWithOpenAICompatible(text) {
  const res = await fetch(`${OPENAI_BASE_URL()}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getSecret('AI_API_KEY') || 'ollama'}`,
    },
    body: JSON.stringify({ model: MODEL(), input: text }),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 404) {
      console.warn(`Embeddings unavailable (404). Semantic search disabled - run "ollama pull ${MODEL()}" to enable.`);
      available = false;
    } else {
      console.warn(`Embeddings failed (${res.status}): ${errText}. Will retry later.`);
    }
    return null;
  }

  const data = await res.json();
  return data.data?.[0]?.embedding || null;
}

export async function embed(text, opts = {}) {
  if (available === false) return null;

  try {
    const inputType = opts.inputType || 'search_document';
    const vector = usesCohere()
      ? await embedWithCohere(text, inputType)
      : await embedWithOpenAICompatible(text);
    if (!vector) return null;

    available = true;
    return vector;
  } catch (err) {
    if (available === null) {
      console.warn(`Embeddings endpoint unreachable: ${err.message}. Semantic search disabled.`);
      available = false;
    }
    return null;
  }
}

export function embeddingsAvailable() {
  return available !== false;
}

export function resetAvailability() {
  available = null;
}
