import { readStoredJson, writeStoredJson, removeStoredJson, WORKSPACE_KEY } from './storage.js';

/**
   * Fetches the current workspace state.
   * @returns {Promise<Workspace|null>}
   */
export async function getWorkspace() {
    return readStoredJson(WORKSPACE_KEY, null);
  }

/**
   * Saves the workspace state.
   * @param {Workspace} state
   * @returns {Promise<void>}
   */
export async function saveWorkspace(state) {
    try {
      await writeStoredJson(WORKSPACE_KEY, state);
    } catch (e) {
      console.error('Failed to save workspace', e);
    }
  }

/**
   * Resets the workspace.
   * @returns {Promise<void>}
   */
export async function resetWorkspace() {
    await removeStoredJson(WORKSPACE_KEY);
  }
