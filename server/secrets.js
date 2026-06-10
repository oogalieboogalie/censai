let initialized = false;

export async function initSecrets() {
  if (initialized) return;
  console.log('Using environment variables for secrets');
  initialized = true;
}

export function getSecret(name) {
  return process.env[name] || '';
}
