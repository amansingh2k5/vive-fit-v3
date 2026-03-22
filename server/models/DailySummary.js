import mongoose from 'mongoose';

// Stores AI-generated daily dashboard summary (cached per day to save API calls)
const dailySummarySchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:      { type: String, required: true },          // "2026-03-21" — one per day
  summary:   { type: String, required: true },           // 4-5 line AI motivational summary
  tips:      [String],                                   // 3 quick tips
  physiqueRating: {
    score:    Number,                                    // 1-10
    feedback: String,
  },
  weakBodyParts: [String],
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

dailySummarySchema.index({ user: 1, date: -1 }, { unique: true });

const DailySummary = mongoose.model('DailySummary', dailySummarySchema);
export default DailySummary;
