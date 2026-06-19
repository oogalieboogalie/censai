import { hkdfSync, randomBytes, createCipheriv, createDecipheriv } from 'crypto';

function masterSecret() {
  if (process.env.JOURNAL_SECRET) return process.env.JOURNAL_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JOURNAL_SECRET is required to use the API key vault');
  }
  return 'homebase-family-sanctuary-default-key';
}

function deriveUserKey(userId) {
  return Buffer.from(hkdfSync('sha256', masterSecret(), String(userId), 'user-api-key-vault', 32));
}

/**
 * Encrypts a plaintext string using a user-specific derived key.
 * @param {string} plaintext
 * @param {number} userId
 * @returns {string} Base64 encoded ciphertext containing IV and Auth Tag
 */
export function encryptKey(plaintext, userId) {
  if (!plaintext) return '';
  const key = deriveUserKey(userId);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypts a ciphertext string using a user-specific derived key.
 * @param {string} ciphertext Base64 encoded ciphertext
 * @param {number} userId
 * @returns {string} Decrypted plaintext
 */
export function decryptKey(ciphertext, userId) {
  if (!ciphertext) return '';
  const key = deriveUserKey(userId);
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted, null, 'utf8') + decipher.final('utf8');
}
