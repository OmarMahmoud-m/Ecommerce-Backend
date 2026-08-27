import crypto from 'crypto';
import express from 'express';
import { User } from '../models/User.js';
import { createToken, requireAuth } from '../middleware/auth.js';

const router = express.Router();
const PASSWORD_MIN_LENGTH = 8;

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derived, 'hex'));
}

router.post('/register', async (req, res, next) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const { password } = req.body;
    if (!name || name.length > 100 || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ error: `Name, a valid email, and a password of at least ${PASSWORD_MIN_LENGTH} characters are required` });
    }
    if (await User.findOne({ where: { email } })) return res.status(409).json({ error: 'Email is already registered' });
    const user = await User.create({ name, email, passwordHash: hashPassword(password) });
    res.status(201).json({ user: publicUser(user), token: createToken(user) });
  } catch (error) { next(error); }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const user = await User.findOne({ where: { email } });
    if (!user || typeof req.body.password !== 'string' || !verifyPassword(req.body.password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.json({ user: publicUser(user), token: createToken(user) });
  } catch (error) { next(error); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(publicUser(user));
  } catch (error) { next(error); }
});

export default router;
