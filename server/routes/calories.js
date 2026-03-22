import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import CalorieLog from '../models/CalorieLog.js';

const router = express.Router();
router.use(verifyToken);

// GET /api/calories?days=7
router.get('/', async (req, res, next) => {
  try {
    const days  = Math.min(Number(req.query.days || 7), 90);
    const since = new Date(Date.now() - days * 86400000);
    const logs  = await CalorieLog.find({ user: req.user._id, date: { $gte: since } }).sort({ date: -1 });
    res.json({ logs });
  } catch (err) { next(err); }
});

// GET /api/calories/today
router.get('/today', async (req, res, next) => {
  try {
    const start = new Date(); start.setHours(0,0,0,0);
    const end   = new Date(); end.setHours(23,59,59,999);
    const log   = await CalorieLog.findOne({ user: req.user._id, date: { $gte: start, $lte: end } });
    res.json({ log: log || null });
  } catch (err) { next(err); }
});

// POST /api/calories/meal  — add a meal to today's log
router.post('/meal', async (req, res, next) => {
  try {
    const { name, calories, protein = 0, carbs = 0, fat = 0, notes } = req.body;
    if (!name || !calories) return res.status(400).json({ message: 'name and calories required' });

    const start = new Date(); start.setHours(0,0,0,0);
    const end   = new Date(); end.setHours(23,59,59,999);

    let log = await CalorieLog.findOne({ user: req.user._id, date: { $gte: start, $lte: end } });
    if (!log) log = new CalorieLog({ user: req.user._id, meals: [] });

    log.meals.push({ name, calories: Number(calories), protein: Number(protein), carbs: Number(carbs), fat: Number(fat), notes });
    await log.save();
    res.json({ log });
  } catch (err) { next(err); }
});

// DELETE /api/calories/meal/:index  — remove meal by index
router.delete('/meal/:index', async (req, res, next) => {
  try {
    const idx   = Number(req.params.index);
    const start = new Date(); start.setHours(0,0,0,0);
    const end   = new Date(); end.setHours(23,59,59,999);

    const log = await CalorieLog.findOne({ user: req.user._id, date: { $gte: start, $lte: end } });
    if (!log) return res.status(404).json({ message: 'No log for today' });

    log.meals.splice(idx, 1);
    await log.save();
    res.json({ log });
  } catch (err) { next(err); }
});

export default router;
