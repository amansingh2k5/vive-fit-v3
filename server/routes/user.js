import express from 'express';
import Joi from 'joi';
import { verifyToken } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();
router.use(verifyToken);

const statsSchema = Joi.object({
  age:      Joi.number().min(13).max(100).required(),
  heightCm: Joi.number().min(100).max(250).required(),
  weightKg: Joi.number().min(30).max(400).required(),
});
const prSchema = Joi.object({
  bench:       Joi.number().min(0).max(1000).required(),
  squat:       Joi.number().min(0).max(1500).required(),
  deadlift:    Joi.number().min(0).max(1500).required(),
  ohp:         Joi.number().min(0).max(500).required(),
  latPulldown: Joi.number().min(0).max(600).required(),
});
const goalSchema = Joi.object({ goal: Joi.string().valid('bulk','cut','recomp').required() });

const profileEditSchema = Joi.object({
  name:     Joi.string().min(2).max(60),
  stats:    Joi.object({ age: Joi.number(), heightCm: Joi.number(), weightKg: Joi.number() }),
  prs:      Joi.object({ bench: Joi.number(), squat: Joi.number(), deadlift: Joi.number(), ohp: Joi.number(), latPulldown: Joi.number() }),
  goal:     Joi.string().valid('bulk','cut','recomp'),
  bio:      Joi.object({
    fitnessLevel:   Joi.string().valid('beginner','intermediate','advanced'),
    yearsTraining:  Joi.number().min(0).max(80),
    injuries:       Joi.string().max(500).allow(''),
    preferredUnits: Joi.string().valid('kg','lbs'),
  }),
  dailyCalorieTarget: Joi.number().min(800).max(10000),
});

// GET /api/user/profile
router.get('/profile', (req, res) => {
  const u = req.user;
  res.json({
    id: u._id, name: u.name, email: u.email,
    stats: u.stats, prs: u.prs, goal: u.goal, bio: u.bio,
    physiquePhotos: u.physiquePhotos, dailyCalorieTarget: u.dailyCalorieTarget,
    onboardingComplete: u.onboardingComplete, strengthScore: u.strengthScore,
  });
});

// PUT /api/user/profile  — full profile edit (from profile page)
router.put('/profile', async (req, res, next) => {
  try {
    const { error, value } = profileEditSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const updates = {};
    if (value.name)               updates.name               = value.name;
    if (value.goal)               updates.goal               = value.goal;
    if (value.dailyCalorieTarget) updates.dailyCalorieTarget  = value.dailyCalorieTarget;
    if (value.stats)              updates.stats              = { ...req.user.stats?.toObject?.() || {}, ...value.stats };
    if (value.prs)                updates.prs                = { ...req.user.prs?.toObject?.()  || {}, ...value.prs  };
    if (value.bio)                updates.bio                = { ...req.user.bio?.toObject?.()  || {}, ...value.bio  };

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });

    // If PRs were updated, push a snapshot to history
    if (value.prs) {
      await User.findByIdAndUpdate(req.user._id, {
        $push: { prHistory: { $each: [{ date: new Date().toISOString().split('T')[0], ...user.prs.toObject() }], $slice: -52 } },
      });
    }

    res.json({
      id: user._id, name: user.name, email: user.email,
      stats: user.stats, prs: user.prs, goal: user.goal, bio: user.bio,
      dailyCalorieTarget: user.dailyCalorieTarget, strengthScore: user.strengthScore,
    });
  } catch (err) { next(err); }
});

// Original onboarding step routes kept for backward compat
router.put('/stats', async (req, res, next) => {
  try {
    const { error, value } = statsSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });
    const user = await User.findByIdAndUpdate(req.user._id, { stats: value }, { new: true });
    res.json({ stats: user.stats });
  } catch (err) { next(err); }
});

router.put('/prs', async (req, res, next) => {
  try {
    const { error, value } = prSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });
    const user = await User.findByIdAndUpdate(req.user._id, { prs: value }, { new: true });
    // Save snapshot
    await User.findByIdAndUpdate(req.user._id, {
      $push: { prHistory: { $each: [{ date: new Date().toISOString().split('T')[0], ...value }], $slice: -52 } },
    });
    res.json({ prs: user.prs, strengthScore: user.strengthScore });
  } catch (err) { next(err); }
});

router.put('/goal', async (req, res, next) => {
  try {
    const { error, value } = goalSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });
    const user = await User.findByIdAndUpdate(req.user._id, { goal: value.goal, onboardingComplete: true }, { new: true });
    res.json({ goal: user.goal, onboardingComplete: user.onboardingComplete });
  } catch (err) { next(err); }
});

router.patch('/calories', async (req, res, next) => {
  try {
    const { dailyCalorieTarget } = req.body;
    if (!dailyCalorieTarget || dailyCalorieTarget < 800 || dailyCalorieTarget > 10000)
      return res.status(400).json({ message: 'Calorie target must be between 800 and 10,000.' });
    const user = await User.findByIdAndUpdate(req.user._id, { dailyCalorieTarget }, { new: true });
    res.json({ dailyCalorieTarget: user.dailyCalorieTarget });
  } catch (err) { next(err); }
});

export default router;
