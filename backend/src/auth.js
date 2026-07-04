import { Router } from 'express';
import crypto from 'crypto';

const router = Router();
const tokenTtlMs = Number(process.env.AUTH_TOKEN_TTL_MS || 24 * 60 * 60 * 1000);

const base64url = (value) => Buffer.from(value).toString('base64url');
const authSecret = () => process.env.AUTH_SECRET || process.env.JWT_SECRET || 'change-me-development-secret';

const sign = (payload) => {
  const encodedPayload = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', authSecret())
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
};

const verify = (token) => {
  try {
    if (!token || !token.includes('.')) return null;
    const [encodedPayload, signature] = token.split('.');
    const expected = crypto
      .createHmac('sha256', authSecret())
      .update(encodedPayload)
      .digest('base64url');

    const providedBuffer = Buffer.from(signature || '');
    const expectedBuffer = Buffer.from(expected);
    if (providedBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) return null;

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

const getAdminCredentials = () => ({
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123'
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const admin = getAdminCredentials();

  if (username !== admin.username || password !== admin.password) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const user = { username: admin.username, role: 'admin' };
  const token = sign({ ...user, exp: Date.now() + tokenTtlMs });
  res.json({ token, user, expiresInMs: tokenTtlMs });
});

router.get('/me', (req, res) => {
  res.json({ user: req.user || null });
});

export const requireAuth = (req, res, next) => {
  if (process.env.AUTH_DISABLED === 'true') {
    req.user = { username: 'auth-disabled', role: 'admin' };
    return next();
  }

  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verify(token);

  if (!payload) return res.status(401).json({ error: 'Authentication required' });
  req.user = { username: payload.username, role: payload.role };
  next();
};

export default router;
