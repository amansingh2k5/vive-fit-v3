import express from 'express';
import Joi from 'joi';
import { verifyToken } from '../middleware/auth.js';
import Workout from '../models/Workout.js';

const router = express.Router();
router.use(verifyToken);

// ── Joi schemas — RPE is fully optional, empty string allowed ──
const setSchema = Joi.object({
  reps:   Joi.number().integer().min(1).max(200).required(),
  weight: Joi.number().min(0).max(2000).required(),
  rpe:    Joi.alternatives().try(Joi.number().min(1).max(10), Joi.string().allow(''), Joi.valid(null)).optional(),
  notes:  Joi.string().max(200).allow('').optional(),
});

const exerciseSchema = Joi.object({
  name:        Joi.string().min(1).max(100).required(),
  muscleGroup: Joi.string().valid('chest','back','legs','shoulders','arms','core','cardio','other').default('other'),
  sets:        Joi.array().items(setSchema).min(1).required(),
});

const workoutSchema = Joi.object({
  date:         Joi.date().iso(),
  exercises:    Joi.array().items(exerciseSchema).min(1).required(),
  durationMins: Joi.number().min(1).max(600).optional(),
  notes:        Joi.string().max(1000).allow('').optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const { from, to, limit = 20 } = req.query;
    const filter = { user: req.user._id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to)   filter.date.$lte = new Date(to);
    }
    const workouts = await Workout.find(filter).sort({ date: -1 }).limit(Number(limit));
    res.json({ workouts });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const workout = await Workout.findOne({ _id: req.params.id, user: req.user._id });
    if (!workout) return res.status(404).json({ message: 'Workout not found.' });
    res.json({ workout });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { error, value } = workoutSchema.validate(req.body, { allowUnknown: false, stripUnknown: true });
    if (error) {
      console.error('[Workout validation]', error.details[0].message, JSON.stringify(req.body).slice(0,200));
      return res.status(400).json({ message: error.details[0].message });
    }
    const workout = await Workout.create({ user: req.user._id, ...value });
    res.status(201).json({ workout });
  } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { error, value } = workoutSchema.validate(req.body, { allowUnknown: false, stripUnknown: true });
    if (error) return res.status(400).json({ message: error.details[0].message });
    const workout = await Workout.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id }, value, { new: true, runValidators: true }
    );
    if (!workout) return res.status(404).json({ message: 'Workout not found.' });
    res.json({ workout });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const workout = await Workout.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!workout) return res.status(404).json({ message: 'Workout not found.' });
    res.json({ message: 'Workout deleted.' });
  } catch (err) { next(err); }
});

export default router;
