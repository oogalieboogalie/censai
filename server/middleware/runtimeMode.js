export function getRuntimeMode() {
  return process.env.CENSAI_MODE || (
    process.env.NODE_ENV === 'production' ? 'cloud_saas' : 'local_desktop'
  );
}

export function requireLocalFilesystem(req, res, next) {
  const mode = getRuntimeMode();

  if (mode === 'cloud_saas') {
    return res.status(403).json({
      error: 'Local filesystem access is disabled in cloud_saas mode',
      mode,
    });
  }

  if (mode === 'private_server' && process.env.CENSAI_ALLOW_LOCAL_FILES !== 'true') {
    return res.status(403).json({
      error: 'Local filesystem access requires CENSAI_ALLOW_LOCAL_FILES=true',
      mode,
    });
  }

  next();
}
