import mongoose from 'mongoose';

const setSchema = new mongoose.Schema({
  reps:   { type: Number, required: true, min: 1, max: 100 },
  weight: { type: Number, required: true, min: 0, max: 2000 }, // kg or lbs (user's choice)
  rpe:    { type: Number, min: 1, max: 10 },                    // Rate of Perceived Exertion
  notes:  { type: String, maxlength: 200 },
}, { _id: false });

const exerciseSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  muscleGroup: {
    type: String,
    enum: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'cardio', 'other'],
    default: 'other',
  },
  sets: [setSchema],
}, { _id: true });

const workoutSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: Date, default: Date.now, index: true },

  exercises: [exerciseSchema],

  // Derived metrics (computed before save)
  totalVolume:   Number,  // sum of (sets × reps × weight) for the session
  totalSets:     Number,
  durationMins:  Number,
  notes:         { type: String, maxlength: 1000 },
}, {
  timestamps: true,
});

// ─── Pre-save: compute derived metrics ─────────────────────
workoutSchema.pre('save', function (next) {
  let volume = 0, sets = 0;
  for (const ex of this.exercises) {
    for (const s of ex.sets) {
      volume += s.reps * s.weight;
      sets++;
    }
  }
  this.totalVolume = Math.round(volume);
  this.totalSets   = sets;
  next();
});

// ─── Compound index for efficient per-user date queries ─────
workoutSchema.index({ user: 1, date: -1 });

const Workout = mongoose.model('Workout', workoutSchema);
export default Workout;
