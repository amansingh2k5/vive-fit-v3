import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import WorkoutSplit from '../models/WorkoutSplit.js';

const router = express.Router();
router.use(verifyToken);

// GET /api/split  — get user's current split
router.get('/', async (req, res, next) => {
  try {
    const split = await WorkoutSplit.findOne({ user: req.user._id });
    res.json({ split: split || null });
  } catch (err) { next(err); }
});

// PUT /api/split  — save / update a custom split
router.put('/', async (req, res, next) => {
  try {
    const { splitType, splitName, days } = req.body;
    const split = await WorkoutSplit.findOneAndUpdate(
      { user: req.user._id },
      { splitType, splitName, days, aiGenerated: false, user: req.user._id },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ split });
  } catch (err) { next(err); }
});

export default router;
