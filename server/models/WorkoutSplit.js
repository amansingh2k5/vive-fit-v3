import mongoose from 'mongoose';

const splitExerciseSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  sets:        { type: Number, default: 3 },
  repsRange:   { type: String, default: '8-12' },
  muscleGroup: { type: String, default: 'other' },
  notes:       { type: String, default: '' },
}, { _id: false });

const splitDaySchema = new mongoose.Schema({
  dayName:      { type: String, required: true },
  focus:        { type: String, default: '' },
  muscleGroups: [{ type: String }],
  exercises:    [splitExerciseSchema],
  isRestDay:    { type: Boolean, default: false },
}, { _id: false });

const workoutSplitSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  splitType:   { type: String, enum: ['ppl','upper_lower','bro_split','full_body','custom'], default: 'ppl' },
  splitName:   { type: String, default: 'My Split' },
  days:        [splitDaySchema],
  aiGenerated: { type: Boolean, default: false },
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

workoutSplitSchema.index({ user: 1 });

const WorkoutSplit = mongoose.model('WorkoutSplit', workoutSplitSchema);
export default WorkoutSplit;
