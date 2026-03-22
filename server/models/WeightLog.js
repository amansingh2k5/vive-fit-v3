import mongoose from 'mongoose';

const weightLogSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:     { type: Date, default: Date.now },
  weightKg: { type: Number, required: true, min: 20, max: 500 },
  notes:    { type: String, maxlength: 300 },
}, {
  timestamps: true,
});

// One log per user per calendar day (upsert-friendly)
weightLogSchema.index({ user: 1, date: -1 });

const WeightLog = mongoose.model('WeightLog', weightLogSchema);
export default WeightLog;
