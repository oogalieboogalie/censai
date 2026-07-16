import { useState, useEffect } from 'react';
import { addAgent, getAgentById, updateAgent, initializeAgents } from '../../lib/agentStore.js';
import { useWorkspaceStore } from '../../lib/store.js';
import { api } from '../../lib/api.js';
import { withTimeout } from '../../lib/appUtils.js';
import { migrateWorkspace } from '../../lib/workspace/allowList.js';

/**
 * Owns the boot lifecycle: session check, agent initialization, workspace load,
 * and the project binding. Returns loading flags and the fetched `initial`
 * payload so the consumer can apply it to the store once ready.
 */
export function useAppBootstrap() {
  const [initial, setInitial] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [session, setSession] = useState({ authenticated: false, oauthConfigured: false });
  const [sessionChecking, setSessionChecking] = useState(true);

  const setCurrentProject = useWorkspaceStore((s) => s.setCurrentProject);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setSessionChecking(true);
      setDataLoading(true);
      setIsInitialized(false);

      let currentSess = { authenticated: false, oauthConfigured: false };
      try {
        currentSess = await api.getSession();
        if (cancelled) return;
        setSession(currentSess);
      } catch (err) {
        console.error('Failed to get session status', err);
      } finally {
        if (!cancelled) setSessionChecking(false);
      }

      if (!currentSess.authenticated) {
        if (!cancelled) setDataLoading(false);
        return;
      }

      initializeAgents().catch((err) => {
        console.error('Failed to initialize agents from database', err);
      });

      try {
        const [res, project] = await Promise.all([
          withTimeout(api.getWorkspace(), 1200, 'Workspace load').catch(() => null),
          withTimeout(api.getCurrentProject(), 1200, 'Current project load').catch(() => null),
        ]);
        if (cancelled) return;
        if (res?.extraAgents?.length) {
          res.extraAgents.forEach((a) => {
            if (!getAgentById(a.id)) {
              addAgent(a);
            } else {
              updateAgent(a);
            }
          });
        }
        // Brief B1 — run the window allow-list migration on the loaded
        // workspace so the rendering layer can gate on the resulting
        // windowAllowList field without re-implementing the back-compat
        // rules. Idempotent: a fresh post-B1 workspace is a no-op.
        const migrated = migrateWorkspace(res || {});
        setInitial(migrated);
        setCurrentProject(project);
      } catch (err) {
        if (!cancelled) return;
        console.error('Failed to load workspace from API', err);
        setInitial({});
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [setCurrentProject]);

  return { initial, dataLoading, isInitialized, session, sessionChecking };
}