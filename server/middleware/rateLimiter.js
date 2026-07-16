// server/middleware/rateLimiter.js
//
// Lightweight in-memory rate limiter for authentication endpoints.
//
// Default policy:
//   - MAX_REQUESTS per WINDOW_MS, keyed by client IP.
//   - On overflow: 429 Too Many Requests with Retry-After header and JSON body.
//
// Bypass rules (BOTH must NOT increment or check the counter):
//   - process.env.RATE_LIMIT_DISABLED === 'true'  (used in CI / opt-out)
//   - request header X-Bypass-Rate-Limit is present and truthy
//     (1 | true | yes | on — case-insensitive)
//
// Public surface:
//   default            Express middleware: (req, res, next) => void
//   resetRateLimiter() Clears the in-memory store (tests / hot reloads)
//   getRateLimiterSnapshot() Returns the current store (test diagnostics only)
//
// Memory model:
//   Fixed-window counter per IP. Expired windows are reaped lazily on access.
//   A periodic sweep runs every SWEEP_MS and uses an unref'd timer so it never
//   blocks process shutdown (notably Jest). To stop it entirely, call
//   resetRateLimiter() then disposeRateLimiter().

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 5;
const SWEEP_MS = 5 * 60 * 1000;

const store = new Map();

let sweepTimer = null;

function readEnvBypass() {
  return process.env.RATE_LIMIT_DISABLED === 'true';
}

function readHeaderBypass(req) {
  if (process.env.NODE_ENV === 'production') return false;
  const raw = req?.headers?.['x-bypass-rate-limit'];
  if (raw === undefined || raw === null) return false;
  const v = String(raw).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function getClientKey(req) {
  // 1) X-Forwarded-For first hop — tests use this to vary IPs cheaply, and
  //    it is also the right answer when the app sits behind a trusted proxy
  //    with `app.set('trust proxy', ...)`.
  const xff = req?.headers?.['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }
  // 2) Express-normalised req.ip (handles trust-proxy configuration)
  if (req?.ip) return req.ip;
  // 3) Raw socket address
  const sock = req?.socket?.remoteAddress;
  if (sock) return sock;
  return 'unknown';
}

function secondsUntilReset(record, now = Date.now()) {
  const elapsed = now - record.windowStartMs;
  const remainingMs = WINDOW_MS - elapsed;
  return Math.max(1, Math.ceil(remainingMs / 1000));
}

function startSweeper() {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store) {
      if (now - record.windowStartMs >= WINDOW_MS) {
        store.delete(key);
      }
    }
  }, SWEEP_MS);
  // Don't keep the event loop alive just for sweeping.
  if (typeof sweepTimer.unref === 'function') sweepTimer.unref();
}

function rateLimiter(req, res, next) {
  // Lazy sweep — start once on first request.
  if (!sweepTimer) startSweeper();

  try {
    if (readEnvBypass() || readHeaderBypass(req)) {
      return next();
    }

    const key = getClientKey(req);
    const now = Date.now();
    const record = store.get(key);

    if (!record || now - record.windowStartMs >= WINDOW_MS) {
      store.set(key, { count: 1, windowStartMs: now });
      return next();
    }

    if (record.count >= MAX_REQUESTS) {
      const retryAfter = secondsUntilReset(record, now);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: `Too many login attempts. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      });
    }

    record.count += 1;
    return next();
  } catch (err) {
    // Never let the limiter crash the auth flow — fail open with a logged warning.
    // The auth handlers themselves will still surface any underlying errors.
    console.warn('[rateLimiter] unexpected error, allowing request:', err?.message);
    return next();
  }
}

function resetRateLimiter() {
  store.clear();
}

function disposeRateLimiter() {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
  store.clear();
}

function getRateLimiterSnapshot() {
  const out = {};
  for (const [k, v] of store) {
    out[k] = { count: v.count, windowStartMs: v.windowStartMs };
  }
  return out;
}

// Convenience property for tests / dev introspection.
rateLimiter.reset = resetRateLimiter;
rateLimiter.dispose = disposeRateLimiter;
rateLimiter.snapshot = getRateLimiterSnapshot;
Object.defineProperty(rateLimiter, 'MAX_REQUESTS', { value: MAX_REQUESTS });
Object.defineProperty(rateLimiter, 'WINDOW_MS', { value: WINDOW_MS });

export { resetRateLimiter, disposeRateLimiter, getRateLimiterSnapshot, MAX_REQUESTS, WINDOW_MS };
export default rateLimiter;
