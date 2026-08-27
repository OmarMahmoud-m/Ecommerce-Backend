import crypto from 'crypto';

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function base64UrlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signingKey() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable must be configured');
  }
  return process.env.JWT_SECRET;
}

export function createToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({ sub: user.id, email: user.email, iat: now, exp: now + TOKEN_TTL_SECONDS }));
  const data = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', signingKey()).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function requireAuth(req, res, next) {
  try {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) throw new Error('Malformed token');
    const expected = crypto.createHmac('sha256', signingKey()).update(`${header}.${payload}`).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('Invalid signature');
    const claims = JSON.parse(base64UrlDecode(payload));
    if (!claims.sub || claims.exp <= Math.floor(Date.now() / 1000)) throw new Error('Expired token');
    req.user = { id: claims.sub, email: claims.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
