function text(value, label) {
  const result = String(value ?? '').trim();
  if (!result) throw new Error(`${label} is required`);
  return result;
}

function defaultWorkspaceId(userId) {
  return `user-${userId}-default`;
}

export async function requireWorkspaceMember(db, {
  userId,
  workspaceId,
  roles = ['owner', 'admin', 'member', 'viewer'],
}) {
  const id = text(workspaceId, 'workspaceId');
  const { rows } = await db.query(
    `SELECT w.id, w.name, wm.role
       FROM workspaces w
       JOIN workspace_members wm ON wm.workspace_id = w.id
      WHERE w.id = $1 AND wm.user_id = $2`,
    [id, userId]
  );
  const workspace = rows[0];
  if (!workspace) {
    const error = new Error('Workspace access denied');
    error.statusCode = 403;
    throw error;
  }
  if (!roles.includes(workspace.role)) {
    const error = new Error('Workspace role does not allow this operation');
    error.statusCode = 403;
    throw error;
  }
  return workspace;
}

export async function ensureUserDefaultWorkspace(db, userId) {
  const existing = await db.query(
    `SELECT w.id, w.name, wm.role
       FROM workspaces w
       JOIN workspace_members wm ON wm.workspace_id = w.id
       LEFT JOIN workspace_client_state wcs
         ON wcs.workspace_id = w.id AND wcs.key = 'homebase.workspace.v1'
      WHERE wm.user_id = $1
      ORDER BY (wcs.value IS NOT NULL) DESC, w.updated_at DESC
      LIMIT 1`,
    [userId]
  );
  if (existing.rows[0]) return existing.rows[0];
  return createOwnedWorkspace(db, {
    userId,
    workspaceId: defaultWorkspaceId(userId),
    name: 'My Workspace',
  });
}

export async function resolveWorkspaceContext(db, {
  userId,
  workspaceId,
  createIfMissing = false,
}) {
  if (!workspaceId) return ensureUserDefaultWorkspace(db, userId);
  const existing = await db.query(
    'SELECT id FROM workspaces WHERE id = $1',
    [workspaceId]
  );
  if (existing.rows[0]) {
    return requireWorkspaceMember(db, { userId, workspaceId });
  }
  if (!createIfMissing) {
    const error = new Error('Workspace not found');
    error.statusCode = 404;
    throw error;
  }
  return createOwnedWorkspace(db, { userId, workspaceId, name: 'Workspace' });
}

async function createOwnedWorkspace(db, { userId, workspaceId, name }) {
  const created = await db.query(
    `INSERT INTO workspaces (id, name, created_by_user_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING
     RETURNING id`,
    [workspaceId, name, userId]
  );
  if (!created.rows[0]) {
    return requireWorkspaceMember(db, { userId, workspaceId });
  }
  await db.query(
    `INSERT INTO workspace_members (workspace_id, user_id, role)
     VALUES ($1, $2, 'owner')
     ON CONFLICT (workspace_id, user_id) DO NOTHING`,
    [workspaceId, userId]
  );
  return requireWorkspaceMember(db, { userId, workspaceId });
}
