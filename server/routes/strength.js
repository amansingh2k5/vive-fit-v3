import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();
router.use(verifyToken);

// GET /api/strength/history  — returns pr snapshot history
router.get('/history', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    // PRHistory stored on user; if not yet seeded, return current as single point
    const history = user.prHistory || [];
    res.json({ history });
  } catch (err) { next(err); }
});

// POST /api/strength/snapshot  — save a PR snapshot (call when user updates PRs)
router.post('/snapshot', async (req, res, next) => {
  try {
    const { bench, squat, deadlift, ohp, latPulldown } = req.body;
    const snapshot = {
      date: new Date().toISOString().split('T')[0],
      bench:       Number(bench)       || 0,
      squat:       Number(squat)       || 0,
      deadlift:    Number(deadlift)    || 0,
      ohp:         Number(ohp)         || 0,
      latPulldown: Number(latPulldown) || 0,
    };

    await User.findByIdAndUpdate(req.user._id, {
      $push: { prHistory: { $each: [snapshot], $slice: -52 } },  // keep 1 year
    });

    res.json({ snapshot });
  } catch (err) { next(err); }
});

export default router;
