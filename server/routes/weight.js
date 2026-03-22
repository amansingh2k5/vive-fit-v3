import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import WeightLog from '../models/WeightLog.js';

const router = express.Router();
router.use(verifyToken);

// ─── GET /api/weight?days=30  – recent logs for chart ─────
router.get('/', async (req, res, next) => {
  try {
    const days   = Math.min(Number(req.query.days || 30), 365);
    const since  = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const logs = await WeightLog.find({ user: req.user._id, date: { $gte: since } })
      .sort({ date: 1 })
      .select('date weightKg');

    res.json({ logs });
  } catch (err) { next(err); }
});

// ─── POST /api/weight  – log today's weight ───────────────
router.post('/', async (req, res, next) => {
  try {
    const { weightKg, notes } = req.body;
    if (!weightKg) return res.status(400).json({ message: 'weightKg is required.' });

    // Upsert: one entry per day per user
    const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
    const endOfDay   = new Date(); endOfDay.setHours(23,59,59,999);

    const log = await WeightLog.findOneAndUpdate(
      { user: req.user._id, date: { $gte: startOfDay, $lte: endOfDay } },
      { weightKg, notes, date: new Date() },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ log });
  } catch (err) { next(err); }
});

export default router;
