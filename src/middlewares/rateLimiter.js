/**
 * In-memory sliding-window rate limiter for public participant self-registration.
 * Limit: 5 submissions per 15 minutes.
 * Penalty on exceed: 45-minute lockout with informative retry message.
 */

const ipStore = new Map();

// Periodic cleanup of stale entries every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipStore.entries()) {
    const isBlockExpired = !record.blockedUntil || record.blockedUntil <= now;
    const isAttemptsExpired =
      !record.attempts ||
      record.attempts.every((t) => now - t > 15 * 60 * 1000);

    if (isBlockExpired && isAttemptsExpired) {
      ipStore.delete(ip);
    }
  }
}, 10 * 60 * 1000);

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return (
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    req.ip ||
    '127.0.0.1'
  );
};

const registrationRateLimiter = (req, res, next) => {
  const ip = getClientIp(req);
  const now = Date.now();

  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  const BLOCK_MS = 45 * 60 * 1000; // 45 minutes
  const MAX_ATTEMPTS = 5;

  let record = ipStore.get(ip);
  if (!record) {
    record = { attempts: [], blockedUntil: null };
    ipStore.set(ip, record);
  }

  // 1. Check if currently blocked
  if (record.blockedUntil && now < record.blockedUntil) {
    const remainingSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    const remainingMinutes = Math.ceil(remainingSeconds / 60);

    res.set('Retry-After', String(remainingSeconds));
    return res.status(429).json({
      success: false,
      message: `You have reached the maximum limit of 5 submissions within 15 minutes. Please retry after ${remainingMinutes} minutes.`,
      retryAfterMinutes: remainingMinutes,
      retryAfterSeconds: remainingSeconds,
    });
  }

  // If block expired, reset block
  if (record.blockedUntil && now >= record.blockedUntil) {
    record.blockedUntil = null;
    record.attempts = [];
  }

  // 2. Filter attempts to the sliding 15-minute window
  record.attempts = record.attempts.filter((timestamp) => now - timestamp < WINDOW_MS);

  // 3. Check if limit exceeded
  if (record.attempts.length >= MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_MS;
    res.set('Retry-After', String(BLOCK_MS / 1000));
    return res.status(429).json({
      success: false,
      message: 'You have reached the submission limit of 5 entries within 15 minutes. Please retry after 45 minutes.',
      retryAfterMinutes: 45,
      retryAfterSeconds: 45 * 60,
    });
  }

  // 4. Record current attempt
  record.attempts.push(now);
  next();
};

module.exports = {
  registrationRateLimiter,
};
