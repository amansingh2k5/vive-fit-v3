import express from 'express';
import crypto from 'crypto';
import Joi from 'joi';
import User from '../models/User.js';
import { verifyToken, issueToken } from '../middleware/auth.js';
import { sendOtpEmail, sendWelcomeEmail } from '../services/mailer.js';

const router = express.Router();

// ─── Joi validation schemas ────────────────────────────────
const registerSchema = Joi.object({
  name:     Joi.string().min(2).max(60).required(),
  email:    Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
});

const resetSchema = Joi.object({
  email:       Joi.string().email().required(),
  otp:         Joi.string().length(6).required(),
  newPassword: Joi.string().min(8).required(),
});

// ─── POST /api/auth/register ───────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const exists = await User.findOne({ email: value.email });
    if (exists) return res.status(409).json({ message: 'Email already registered.' });

    const user = await User.create(value);
    issueToken(res, user._id);

    await sendWelcomeEmail(user.email, user.name).catch(() => {}); // non-critical

    res.status(201).json({
      message: 'Account created!',
      user: { id: user._id, name: user.name, email: user.email, onboardingComplete: false },
    });
  } catch (err) { next(err); }
});

// ─── POST /api/auth/login ──────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const user = await User.findOne({ email: value.email }).select('+password');
    if (!user || !(await user.comparePassword(value.password)))
      return res.status(401).json({ message: 'Invalid email or password.' });

    issueToken(res, user._id);
    res.json({
      user: {
        id:                 user._id,
        name:               user.name,
        email:              user.email,
        onboardingComplete: user.onboardingComplete,
        goal:               user.goal,
        prs:                user.prs,
        stats:              user.stats,
        dailyCalorieTarget: user.dailyCalorieTarget,
        strengthScore:      user.strengthScore,
      },
    });
  } catch (err) { next(err); }
});

// ─── POST /api/auth/logout ─────────────────────────────────
router.post('/logout', (_req, res) => {
  res.clearCookie('token').json({ message: 'Logged out.' });
});

// ─── GET /api/auth/me  (validate session) ─────────────────
router.get('/me', verifyToken, (req, res) => {
  const u = req.user;
  res.json({
    id:                 u._id,
    name:               u.name,
    email:              u.email,
    onboardingComplete: u.onboardingComplete,
    goal:               u.goal,
    prs:                u.prs,
    stats:              u.stats,
    dailyCalorieTarget: u.dailyCalorieTarget,
    physiquePhotos:     u.physiquePhotos,
    strengthScore:      u.strengthScore,
  });
});

// ─── POST /api/auth/forgot-password ───────────────────────
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+resetOtp +resetOtpExpiry');
    // Always return 200 to prevent email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset code has been sent.' });

    const otp = crypto.randomInt(100000, 999999).toString();
    user.resetOtp       = otp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save({ validateModifiedOnly: true });

    await sendOtpEmail(user.email, otp);
    res.json({ message: 'If that email exists, a reset code has been sent.' });
  } catch (err) { next(err); }
});

// ─── POST /api/auth/reset-password ────────────────────────
router.post('/reset-password', async (req, res, next) => {
  try {
    const { error, value } = resetSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const user = await User.findOne({ email: value.email.toLowerCase() })
      .select('+password +resetOtp +resetOtpExpiry');

    if (!user || !user.isOtpValid(value.otp))
      return res.status(400).json({ message: 'Invalid or expired reset code.' });

    user.password       = value.newPassword;
    user.resetOtp       = undefined;
    user.resetOtpExpiry = undefined;
    await user.save({ validateModifiedOnly: true });

    res.json({ message: 'Password reset successfully. Please log in.' });
  } catch (err) { next(err); }
});

export default router;
