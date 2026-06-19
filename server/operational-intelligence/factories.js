const OWNER_KINDS = new Set(['user', 'agent', 'system']);
const VISIBILITIES = new Set(['private', 'workspace', 'organization', 'public']);

const defaultActor = { kind: 'user', id: 'local-user' };

function assertText(value, label) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${label} is required`);
  return text;
}

function actor(input = defaultActor) {
  const kind = input.kind || defaultActor.kind;
  const id = input.id || defaultActor.id;
  if (!OWNER_KINDS.has(kind)) throw new Error(`Invalid actor kind: ${kind}`);
  return { kind, id: assertText(id, 'actor.id') };
}

function json(value) {
  return JSON.stringify(value && typeof value === 'object' ? value : {});
}

export async function createWorkspaceEvent(ctx, input) {
  const db = ctx.db;
  const who = actor(input.actor);
  const workspaceId = assertText(input.workspaceId, 'workspaceId');
  const type = assertText(input.type, 'type');
  const { rows } = await db.query(
    `INSERT INTO workspace_events
      (workspace_id, event_type, actor_kind, actor_id, artifact_id, relationship_id,
       correlation_id, causation_event_id, payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
     RETURNING *`,
    [
      workspaceId, type, who.kind, who.id, input.artifactId || null,
      input.relationshipId || null, input.correlationId || null,
      input.causationEventId || null, json(input.payload),
    ]
  );
  return rows[0];
}

export async function createArtifact(ctx, input) {
  const db = ctx.db;
  const owner = actor(input.owner);
  const visibility = input.visibility || 'workspace';
  if (!VISIBILITIES.has(visibility)) throw new Error(`Invalid visibility: ${visibility}`);
  const workspaceId = assertText(input.workspaceId, 'workspaceId');
  const type = assertText(input.type, 'type');
  const title = assertText(input.title, 'title');
  const { rows } = await db.query(
    `INSERT INTO artifacts
      (workspace_id, owner_kind, owner_id, visibility, artifact_type, title, data, metadata, source_ref)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb)
     RETURNING *`,
    [workspaceId, owner.kind, owner.id, visibility, type, title, json(input.data), json(input.metadata), json(input.sourceRef)]
  );
  const artifact = rows[0];
  await createWorkspaceEvent(ctx, {
    workspaceId,
    type: 'artifact.created',
    actor: owner,
    artifactId: artifact.id,
    correlationId: input.correlationId,
    payload: { artifactType: type, title },
  });
  return artifact;
}

export async function createRelationship(ctx, input) {
  const workspaceId = assertText(input.workspaceId, 'workspaceId');
  const type = assertText(input.type, 'type');
  const strength = Number.isFinite(input.strength) ? input.strength : 1;
  const insert = await ctx.db.query(
    `INSERT INTO relationships
      (workspace_id, source_artifact_id, target_artifact_id, relationship_type, strength, metadata)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb)
     ON CONFLICT (source_artifact_id, target_artifact_id, relationship_type) WHERE ended_at IS NULL
     DO NOTHING
     RETURNING *`,
    [workspaceId, input.sourceArtifactId, input.targetArtifactId, type, strength, json(input.metadata)]
  );
  if (insert.rows[0]) {
    const event = await createWorkspaceEvent(ctx, {
      workspaceId,
      type: 'relationship.created',
      actor: input.actor || defaultActor,
      relationshipId: insert.rows[0].id,
      correlationId: input.correlationId,
      payload: { relationshipType: type, sourceArtifactId: input.sourceArtifactId, targetArtifactId: input.targetArtifactId },
    });
    await ctx.db.query('UPDATE relationships SET created_by_event_id = $1 WHERE id = $2', [event.id, insert.rows[0].id]);
    return { ...insert.rows[0], created_by_event_id: event.id };
  }
  const { rows } = await ctx.db.query(
    `SELECT * FROM relationships
     WHERE source_artifact_id = $1 AND target_artifact_id = $2 AND relationship_type = $3 AND ended_at IS NULL
     LIMIT 1`,
    [input.sourceArtifactId, input.targetArtifactId, type]
  );
  return rows[0];
}

export async function resolveArtifact(ctx, ref) {
  if (ref.artifactId) {
    const { rows } = await ctx.db.query('SELECT * FROM artifacts WHERE id = $1 AND deleted_at IS NULL', [ref.artifactId]);
    return rows[0] || null;
  }
  if (ref.workspaceId && ref.sourceRef) {
    const { rows } = await ctx.db.query(
      'SELECT * FROM artifacts WHERE workspace_id = $1 AND source_ref @> $2::jsonb AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1',
      [ref.workspaceId, json(ref.sourceRef)]
    );
    return rows[0] || null;
  }
  if (ref.workspaceId && ref.type && ref.title) {
    const { rows } = await ctx.db.query(
      'SELECT * FROM artifacts WHERE workspace_id = $1 AND artifact_type = $2 AND title = $3 AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1',
      [ref.workspaceId, ref.type, ref.title]
    );
    return rows[0] || null;
  }
  throw new Error('Unsupported artifact reference');
}
