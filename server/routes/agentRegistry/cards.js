// Agent Registry — CRUD handlers.
// D2 of the marketplace/registry push. Backed by server/agent-registry/factories.js
// (D1). Visibility filtering per the brief:
//   - public: returned to anyone
//   - workspace: returned to anyone in the workspace (we treat any
//     authenticated caller as a workspace member for now; workspace
//     membership is enforced separately by other routes — out of scope)
//   - private: returned only to the owner
//
// owner_id format: we use the actor id (the session userId, stringified).
// This is consistent with the factory's TEXT owner_id column.

import {
  createAgentCard,
  getAgentCard,
  listAgentCards,
  updateAgentCard,
  deleteAgentCard,
} from '../../agent-registry/factories.js';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parseIntParam(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function generateOwnerScopedId(actorId, requestedId) {
  // If the caller supplied an id we use it verbatim. Otherwise we
  // mint one shaped like "ext:<owner>:<slug>" so it can never collide
  // with a system "agent:*" id. Slug defaults to a short timestamp.
  if (requestedId && typeof requestedId === 'string' && requestedId.trim()) {
    return requestedId.trim();
  }
  const slug = Math.random().toString(36).slice(2, 8);
  return `ext:${actorId}:${Date.now().toString(36)}-${slug}`;
}

/**
 * Visibility check for a single-card read. Returns true if the actor
 * is allowed to see the card. The actor argument may be null when the
 * request is unauthenticated (the GET /cards route).
 */
function canSee(card, actor) {
  if (!card) return false;
  if (card.visibility === 'public') return true;
  if (card.visibility === 'workspace') return !!actor;
  if (card.visibility === 'private') return !!actor && card.owner_id === actor.id;
  return false;
}

// ─── LIST ─────────────────────────────────────────────────────────────────────

export async function listCards(req, res) {
  try {
    const { visibility, owner_id, workspace_id } = req.query;
    const limit = parseIntParam(req.query.limit, DEFAULT_LIMIT, { min: 1, max: MAX_LIMIT });
    const offset = parseIntParam(req.query.offset, 0, { min: 0 });

    const rows = await listAgentCards({ visibility, owner_id, workspace_id, limit, offset });

    // Visibility filter: for unauthenticated callers, drop non-public.
    const actor = req.agentActor || null;
    const items = rows.filter((row) => canSee(row, actor));

    res.json({
      items,
      total: items.length,
      limit,
      offset,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// ─── READ ONE ────────────────────────────────────────────────────────────────

export async function readCard(req, res) {
  try {
    const card = await getAgentCard(req.params.id);
    if (!card) return res.status(404).json({ error: 'Card not found' });

    // Visibility-aware auth: a private card MUST know its caller to
    // decide whether to hide. resolveActor in index.js always sets
    // req.agentActor (null when unauthenticated), so we just check
    // visibility here. Public and workspace cards stay reachable
    // without auth; private cards need an authenticated owner.
    const actor = req.agentActor;
    if (card.visibility === 'private' && !actor) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!canSee(card, actor)) return res.status(404).json({ error: 'Card not found' });
    res.json(card);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// ─── CREATE ──────────────────────────────────────────────────────────────────

export async function createCard(req, res) {
  try {
    const actor = req.agentActor;
    if (!actor) return res.status(401).json({ error: 'Authentication required' });

    const body = req.body || {};
    const id = generateOwnerScopedId(actor.id, body.id);

    const card = await createAgentCard({
      id,
      name: body.name,
      description: body.description,
      version: body.version,
      skills: body.skills,
      endpoint: body.endpoint,
      auth: body.auth,
      metadata: body.metadata,
      // Default to 'private' at the route level so the factory's arg
      // always carries an explicit visibility. The factory would
      // default to 'private' anyway, but passing it through makes the
      // surface easier to reason about in tests and dashboards.
      visibility: body.visibility || 'private',
      owner_id: actor.id,
      workspace_id: body.workspace_id || null,
    });
    res.status(201).json(card);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────

export async function updateCard(req, res) {
  try {
    const actor = req.agentActor;
    if (!actor) return res.status(401).json({ error: 'Authentication required' });

    const existing = await getAgentCard(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Card not found' });
    if (existing.owner_id !== actor.id) {
      return res.status(403).json({ error: 'Only the owner can update this card' });
    }

    const patch = req.body || {};
    // owner_id and id are immutable after creation — strip them defensively.
    delete patch.id;
    delete patch.owner_id;

    const updated = await updateAgentCard(req.params.id, patch);
    if (!updated) return res.status(404).json({ error: 'Card not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// ─── SOFT DELETE ─────────────────────────────────────────────────────────────

export async function deleteCard(req, res) {
  try {
    const actor = req.agentActor;
    if (!actor) return res.status(401).json({ error: 'Authentication required' });

    const existing = await getAgentCard(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Card not found' });
    if (existing.owner_id !== actor.id) {
      return res.status(403).json({ error: 'Only the owner can delete this card' });
    }

    const removed = await deleteAgentCard(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Card not found' });
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}