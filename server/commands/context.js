import { actorFromRequest } from '../context/actorContext.js';
import { workspaceContextFromRequest } from '../context/requestContext.js';
import { getRuntimeMode } from '../middleware/runtimeMode.js';

function readOptionalWorkspaceId(req) {
  try {
    return workspaceContextFromRequest(req).workspaceId;
  } catch {
    return null;
  }
}

export function commandContextFromRequest(req) {
  return {
    userId: String(req?.session?.userId ?? '').trim() || null,
    userRole: String(req?.session?.userRole ?? 'user').trim().toLowerCase(),
    workspaceId: readOptionalWorkspaceId(req),
    actor: actorFromRequest(req),
    runtimeMode: getRuntimeMode(),
  };
}
