import mongoose from 'mongoose';

const mealSchema = new mongoose.Schema({
  name:       { type: String, required: true },  // "Breakfast", "Lunch", custom
  calories:   { type: Number, required: true, min: 0 },
  protein:    { type: Number, default: 0 },      // grams
  carbs:      { type: Number, default: 0 },
  fat:        { type: Number, default: 0 },
  notes:      String,
}, { _id: false });

const calorieLogSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date:        { type: Date, default: Date.now, index: true },
  meals:       [mealSchema],
  totalCalories: { type: Number, default: 0 },
  totalProtein:  { type: Number, default: 0 },
  totalCarbs:    { type: Number, default: 0 },
  totalFat:      { type: Number, default: 0 },
  notes:       String,
}, { timestamps: true });

// Auto-sum macros before save
calorieLogSchema.pre('save', function (next) {
  this.totalCalories = this.meals.reduce((s, m) => s + (m.calories || 0), 0);
  this.totalProtein  = this.meals.reduce((s, m) => s + (m.protein  || 0), 0);
  this.totalCarbs    = this.meals.reduce((s, m) => s + (m.carbs    || 0), 0);
  this.totalFat      = this.meals.reduce((s, m) => s + (m.fat      || 0), 0);
  next();
});

calorieLogSchema.index({ user: 1, date: -1 });

const CalorieLog = mongoose.model('CalorieLog', calorieLogSchema);
export default CalorieLog;
