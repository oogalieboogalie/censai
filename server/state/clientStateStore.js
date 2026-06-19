import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_STATE_DIR = path.resolve(path.join(__dirname, '..', '..', '.homebase-state'));

export const CLIENT_STATE_KEYS = new Map([
  ['homebase.workspace.v1', 'workspace.json'],
  ['homebase.presets.v1', 'presets.json'],
  ['homebase.theme.customPresets.v1', 'theme-custom-presets.json'],
  ['homebase.journals.v1', 'journals.json'],
  ['homebase.scheduler.v1', 'schedules.json'],
]);

export const WORKSPACE_STATE_KEY = 'homebase.workspace.v1';

function clientStatePath(key) {
  const file = CLIENT_STATE_KEYS.get(key);
  return file ? path.join(LOCAL_STATE_DIR, file) : null;
}

export function isSupportedClientStateKey(key) {
  return CLIENT_STATE_KEYS.has(key);
}

export async function getUserState({ db, userId, key }) {
  const dbRes = await db.query(
    'SELECT value FROM user_client_state WHERE user_id = $1 AND key = $2',
    [userId, key]
  );

  if (dbRes.rows.length > 0) {
    return { found: true, source: 'database', value: dbRes.rows[0].value };
  }

  const filePath = clientStatePath(key);
  if (!filePath || !fs.existsSync(filePath)) {
    return { found: false, source: 'missing', value: null };
  }

  const raw = await fs.promises.readFile(filePath, 'utf8');
  const value = JSON.parse(raw);
  await setUserState({ db, userId, key, value });
  return { found: true, source: 'local-file', value };
}

export async function setUserState({ db, userId, key, value }) {
  await db.query(
    `INSERT INTO user_client_state (user_id, key, value)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, key) DO UPDATE
     SET value = $3, updated_at = NOW()`,
    [userId, key, JSON.stringify(value)]
  );
}

export async function deleteUserState({ db, userId, key }) {
  await db.query(
    'DELETE FROM user_client_state WHERE user_id = $1 AND key = $2',
    [userId, key]
  );
}
