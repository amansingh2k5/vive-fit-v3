import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const statsSchema = new mongoose.Schema({
  age:      { type: Number, min: 13, max: 100 },
  heightCm: { type: Number, min: 100, max: 250 },
  weightKg: { type: Number, min: 30,  max: 400 },
}, { _id: false });

const prSchema = new mongoose.Schema({
  bench:       { type: Number, default: 0 },
  squat:       { type: Number, default: 0 },
  deadlift:    { type: Number, default: 0 },
  ohp:         { type: Number, default: 0 },
  latPulldown: { type: Number, default: 0 },
}, { _id: false });

// Historical PR snapshots for strength trend graph
const prSnapshotSchema = new mongoose.Schema({
  date:        String,
  bench:       Number,
  squat:       Number,
  deadlift:    Number,
  ohp:         Number,
  latPulldown: Number,
}, { _id: false });

const userSchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6, select: false },

  onboardingComplete: { type: Boolean, default: false },
  stats:  { type: statsSchema, default: {} },
  prs:    { type: prSchema,    default: {} },
  goal:   { type: String, enum: ['bulk', 'cut', 'recomp'], default: 'recomp' },

  // Bio extras (editable from profile)
  bio: {
    fitnessLevel:    { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'intermediate' },
    yearsTraining:   { type: Number, default: 0 },
    injuries:        { type: String, default: '' },
    preferredUnits:  { type: String, enum: ['kg', 'lbs'], default: 'kg' },
  },

  physiquePhotos: [{ url: String, publicId: String, uploadedAt: { type: Date, default: Date.now } }],
  dailyCalorieTarget: { type: Number, default: 2500 },
  prHistory: [prSnapshotSchema],   // for strength trend graph

  resetOtp:       { type: String, select: false },
  resetOtpExpiry: { type: Date,   select: false },
}, { timestamps: true });

userSchema.virtual('strengthScore').get(function () {
  const { bench = 0, squat = 0, deadlift = 0, ohp = 0, latPulldown = 0 } = this.prs || {};
  const raw = bench * 1.0 + squat * 1.2 + deadlift * 1.3 + ohp * 0.8 + latPulldown * 0.7;
  return Math.min(Math.round(raw / 8), 1000);
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};
userSchema.methods.isOtpValid = function (otp) {
  return this.resetOtp === otp && this.resetOtpExpiry > Date.now();
};

const User = mongoose.model('User', userSchema);
export default User;
