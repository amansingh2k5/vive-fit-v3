import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'Not authenticated.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'User no longer exists.' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export const issueToken = (res, userId) => {
  const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('token', token, {
    httpOnly: true,
    secure:   isProd,                        // HTTPS only in production
    sameSite: isProd ? 'none' : 'lax',       // 'none' required for cross-origin cookies (frontend ↔ backend on different Vercel URLs)
    maxAge:   7 * 24 * 60 * 60 * 1000,      // 7 days
    path:     '/',
  });

  return token;
};
