import express from 'express';
import OpenAI from 'openai';
import { verifyToken } from '../middleware/auth.js';
import Workout from '../models/Workout.js';
import WeightLog from '../models/WeightLog.js';
import CalorieLog from '../models/CalorieLog.js';
import WorkoutSplit from '../models/WorkoutSplit.js';
import DailySummary from '../models/DailySummary.js';
import User from '../models/User.js';

const router = express.Router();
router.use(verifyToken);

// Lazy OpenAI — never crashes at startup if key is missing
let _openai = null;
const getAI = () => {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.startsWith('sk-proj-your')) {
    throw Object.assign(new Error('OpenAI API key not set in server/.env'), { statusCode: 503 });
  }
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
};

const parseJSON = raw => {
  const clean = raw.trim()
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '').trim();
  return JSON.parse(clean);
};

// ── Built-in fallback splits (no API key needed) ──────────
const FALLBACK = {
  ppl: { splitName:'Push Pull Legs', splitType:'ppl', days:[
    { dayName:'Monday',    focus:'Push — Chest, Shoulders, Triceps', muscleGroups:['chest','shoulders','arms'], isRestDay:false, exercises:[{name:'Bench Press',sets:4,repsRange:'6-10',muscleGroup:'chest',notes:'Control the descent'},{name:'Overhead Press',sets:3,repsRange:'8-12',muscleGroup:'shoulders',notes:''},{name:'Incline Dumbbell Press',sets:3,repsRange:'10-12',muscleGroup:'chest',notes:''},{name:'Lateral Raises',sets:3,repsRange:'15-20',muscleGroup:'shoulders',notes:''},{name:'Tricep Pushdown',sets:3,repsRange:'12-15',muscleGroup:'arms',notes:''}]},
    { dayName:'Tuesday',   focus:'Pull — Back & Biceps', muscleGroups:['back','arms'], isRestDay:false, exercises:[{name:'Deadlift',sets:4,repsRange:'4-6',muscleGroup:'back',notes:'Brace your core'},{name:'Lat Pulldown',sets:4,repsRange:'8-12',muscleGroup:'back',notes:''},{name:'Barbell Row',sets:3,repsRange:'8-10',muscleGroup:'back',notes:''},{name:'Face Pulls',sets:3,repsRange:'15-20',muscleGroup:'back',notes:''},{name:'Barbell Curl',sets:3,repsRange:'10-12',muscleGroup:'arms',notes:''}]},
    { dayName:'Wednesday', focus:'Legs', muscleGroups:['legs'], isRestDay:false, exercises:[{name:'Squat',sets:4,repsRange:'6-10',muscleGroup:'legs',notes:'Break parallel'},{name:'Romanian Deadlift',sets:3,repsRange:'8-12',muscleGroup:'legs',notes:''},{name:'Leg Press',sets:3,repsRange:'12-15',muscleGroup:'legs',notes:''},{name:'Leg Curl',sets:3,repsRange:'10-15',muscleGroup:'legs',notes:''},{name:'Calf Raises',sets:4,repsRange:'15-20',muscleGroup:'legs',notes:''}]},
    { dayName:'Thursday',  focus:'Push — Chest, Shoulders, Triceps', muscleGroups:['chest','shoulders','arms'], isRestDay:false, exercises:[{name:'Incline Bench Press',sets:4,repsRange:'6-10',muscleGroup:'chest',notes:''},{name:'Dumbbell Shoulder Press',sets:3,repsRange:'10-12',muscleGroup:'shoulders',notes:''},{name:'Cable Fly',sets:3,repsRange:'12-15',muscleGroup:'chest',notes:''},{name:'Arnold Press',sets:3,repsRange:'10-12',muscleGroup:'shoulders',notes:''},{name:'Skull Crushers',sets:3,repsRange:'10-12',muscleGroup:'arms',notes:''}]},
    { dayName:'Friday',    focus:'Pull — Back & Biceps', muscleGroups:['back','arms'], isRestDay:false, exercises:[{name:'Pull-ups',sets:4,repsRange:'6-10',muscleGroup:'back',notes:'Full hang at bottom'},{name:'Cable Row',sets:4,repsRange:'10-12',muscleGroup:'back',notes:''},{name:'Single Arm Row',sets:3,repsRange:'10-12',muscleGroup:'back',notes:''},{name:'Reverse Fly',sets:3,repsRange:'15-20',muscleGroup:'back',notes:''},{name:'Hammer Curl',sets:3,repsRange:'10-12',muscleGroup:'arms',notes:''}]},
    { dayName:'Saturday',  focus:'Legs', muscleGroups:['legs'], isRestDay:false, exercises:[{name:'Front Squat',sets:3,repsRange:'6-8',muscleGroup:'legs',notes:''},{name:'Bulgarian Split Squat',sets:3,repsRange:'8-10',muscleGroup:'legs',notes:''},{name:'Leg Extension',sets:3,repsRange:'12-15',muscleGroup:'legs',notes:''},{name:'Nordic Curl',sets:3,repsRange:'6-8',muscleGroup:'legs',notes:''},{name:'Calf Raises',sets:4,repsRange:'15-20',muscleGroup:'legs',notes:''}]},
    { dayName:'Sunday',    focus:'Rest & Recovery', muscleGroups:[], isRestDay:true, exercises:[] },
  ]},
  upper_lower: { splitName:'Upper / Lower', splitType:'upper_lower', days:[
    { dayName:'Monday',    focus:'Upper — Chest & Back & Shoulders', muscleGroups:['chest','back','shoulders'], isRestDay:false, exercises:[{name:'Bench Press',sets:4,repsRange:'6-8',muscleGroup:'chest',notes:''},{name:'Barbell Row',sets:4,repsRange:'6-8',muscleGroup:'back',notes:''},{name:'Overhead Press',sets:3,repsRange:'8-10',muscleGroup:'shoulders',notes:''},{name:'Pull-ups',sets:3,repsRange:'6-10',muscleGroup:'back',notes:''},{name:'Incline Dumbbell Press',sets:3,repsRange:'10-12',muscleGroup:'chest',notes:''}]},
    { dayName:'Tuesday',   focus:'Lower — Squat Focus', muscleGroups:['legs'], isRestDay:false, exercises:[{name:'Squat',sets:4,repsRange:'6-8',muscleGroup:'legs',notes:''},{name:'Romanian Deadlift',sets:3,repsRange:'8-10',muscleGroup:'legs',notes:''},{name:'Leg Press',sets:3,repsRange:'10-12',muscleGroup:'legs',notes:''},{name:'Leg Curl',sets:3,repsRange:'10-15',muscleGroup:'legs',notes:''},{name:'Calf Raises',sets:4,repsRange:'15-20',muscleGroup:'legs',notes:''}]},
    { dayName:'Wednesday', focus:'Rest', muscleGroups:[], isRestDay:true, exercises:[] },
    { dayName:'Thursday',  focus:'Upper — Arms & Chest & Back', muscleGroups:['chest','back','arms'], isRestDay:false, exercises:[{name:'Incline Press',sets:4,repsRange:'8-10',muscleGroup:'chest',notes:''},{name:'Lat Pulldown',sets:4,repsRange:'8-12',muscleGroup:'back',notes:''},{name:'Dumbbell Row',sets:3,repsRange:'10-12',muscleGroup:'back',notes:''},{name:'Barbell Curl',sets:3,repsRange:'10-12',muscleGroup:'arms',notes:''},{name:'Tricep Dip',sets:3,repsRange:'10-12',muscleGroup:'arms',notes:''}]},
    { dayName:'Friday',    focus:'Lower — Deadlift Focus', muscleGroups:['legs'], isRestDay:false, exercises:[{name:'Deadlift',sets:4,repsRange:'4-6',muscleGroup:'legs',notes:''},{name:'Bulgarian Split Squat',sets:3,repsRange:'8-10',muscleGroup:'legs',notes:''},{name:'Leg Extension',sets:3,repsRange:'12-15',muscleGroup:'legs',notes:''},{name:'Nordic Curl',sets:3,repsRange:'6-8',muscleGroup:'legs',notes:''},{name:'Seated Calf Raises',sets:3,repsRange:'15-20',muscleGroup:'legs',notes:''}]},
    { dayName:'Saturday',  focus:'Rest', muscleGroups:[], isRestDay:true, exercises:[] },
    { dayName:'Sunday',    focus:'Rest', muscleGroups:[], isRestDay:true, exercises:[] },
  ]},
  bro_split: { splitName:'Bro Split', splitType:'bro_split', days:[
    { dayName:'Monday',    focus:'Chest', muscleGroups:['chest'], isRestDay:false, exercises:[{name:'Bench Press',sets:5,repsRange:'6-10',muscleGroup:'chest',notes:''},{name:'Incline Dumbbell Press',sets:4,repsRange:'8-12',muscleGroup:'chest',notes:''},{name:'Cable Fly',sets:3,repsRange:'12-15',muscleGroup:'chest',notes:''},{name:'Dips',sets:3,repsRange:'10-12',muscleGroup:'chest',notes:''},{name:'Decline Press',sets:3,repsRange:'10-12',muscleGroup:'chest',notes:''}]},
    { dayName:'Tuesday',   focus:'Back', muscleGroups:['back'], isRestDay:false, exercises:[{name:'Deadlift',sets:4,repsRange:'4-6',muscleGroup:'back',notes:''},{name:'Pull-ups',sets:4,repsRange:'6-10',muscleGroup:'back',notes:''},{name:'Barbell Row',sets:4,repsRange:'8-10',muscleGroup:'back',notes:''},{name:'Lat Pulldown',sets:3,repsRange:'10-12',muscleGroup:'back',notes:''},{name:'Cable Row',sets:3,repsRange:'12-15',muscleGroup:'back',notes:''}]},
    { dayName:'Wednesday', focus:'Shoulders', muscleGroups:['shoulders'], isRestDay:false, exercises:[{name:'Overhead Press',sets:4,repsRange:'6-10',muscleGroup:'shoulders',notes:''},{name:'Lateral Raises',sets:4,repsRange:'15-20',muscleGroup:'shoulders',notes:''},{name:'Front Raises',sets:3,repsRange:'12-15',muscleGroup:'shoulders',notes:''},{name:'Face Pulls',sets:3,repsRange:'15-20',muscleGroup:'shoulders',notes:''},{name:'Arnold Press',sets:3,repsRange:'10-12',muscleGroup:'shoulders',notes:''}]},
    { dayName:'Thursday',  focus:'Arms', muscleGroups:['arms'], isRestDay:false, exercises:[{name:'Barbell Curl',sets:4,repsRange:'8-12',muscleGroup:'arms',notes:''},{name:'Skull Crushers',sets:4,repsRange:'8-12',muscleGroup:'arms',notes:''},{name:'Hammer Curl',sets:3,repsRange:'10-12',muscleGroup:'arms',notes:''},{name:'Tricep Pushdown',sets:3,repsRange:'12-15',muscleGroup:'arms',notes:''},{name:'Concentration Curl',sets:3,repsRange:'12-15',muscleGroup:'arms',notes:''}]},
    { dayName:'Friday',    focus:'Legs', muscleGroups:['legs'], isRestDay:false, exercises:[{name:'Squat',sets:4,repsRange:'6-10',muscleGroup:'legs',notes:''},{name:'Romanian Deadlift',sets:3,repsRange:'8-12',muscleGroup:'legs',notes:''},{name:'Leg Press',sets:3,repsRange:'12-15',muscleGroup:'legs',notes:''},{name:'Leg Curl',sets:3,repsRange:'10-15',muscleGroup:'legs',notes:''},{name:'Calf Raises',sets:4,repsRange:'15-20',muscleGroup:'legs',notes:''}]},
    { dayName:'Saturday',  focus:'Rest', muscleGroups:[], isRestDay:true, exercises:[] },
    { dayName:'Sunday',    focus:'Rest', muscleGroups:[], isRestDay:true, exercises:[] },
  ]},
  full_body: { splitName:'Full Body', splitType:'full_body', days:[
    { dayName:'Monday',    focus:'Full Body A', muscleGroups:['chest','back','legs','shoulders'], isRestDay:false, exercises:[{name:'Squat',sets:4,repsRange:'6-8',muscleGroup:'legs',notes:''},{name:'Bench Press',sets:3,repsRange:'8-10',muscleGroup:'chest',notes:''},{name:'Barbell Row',sets:3,repsRange:'8-10',muscleGroup:'back',notes:''},{name:'Overhead Press',sets:3,repsRange:'8-10',muscleGroup:'shoulders',notes:''},{name:'Romanian Deadlift',sets:3,repsRange:'10-12',muscleGroup:'legs',notes:''}]},
    { dayName:'Tuesday',   focus:'Rest', muscleGroups:[], isRestDay:true, exercises:[] },
    { dayName:'Wednesday', focus:'Full Body B', muscleGroups:['back','chest','legs','arms'], isRestDay:false, exercises:[{name:'Deadlift',sets:4,repsRange:'4-6',muscleGroup:'back',notes:''},{name:'Incline Press',sets:3,repsRange:'8-10',muscleGroup:'chest',notes:''},{name:'Pull-ups',sets:3,repsRange:'6-10',muscleGroup:'back',notes:''},{name:'Leg Press',sets:3,repsRange:'10-12',muscleGroup:'legs',notes:''},{name:'Dumbbell Curl',sets:3,repsRange:'12-15',muscleGroup:'arms',notes:''}]},
    { dayName:'Thursday',  focus:'Rest', muscleGroups:[], isRestDay:true, exercises:[] },
    { dayName:'Friday',    focus:'Full Body C', muscleGroups:['legs','chest','back','shoulders'], isRestDay:false, exercises:[{name:'Front Squat',sets:4,repsRange:'6-8',muscleGroup:'legs',notes:''},{name:'Dumbbell Press',sets:3,repsRange:'10-12',muscleGroup:'chest',notes:''},{name:'Cable Row',sets:3,repsRange:'10-12',muscleGroup:'back',notes:''},{name:'Lateral Raises',sets:3,repsRange:'15-20',muscleGroup:'shoulders',notes:''},{name:'Nordic Curl',sets:3,repsRange:'6-8',muscleGroup:'legs',notes:''}]},
    { dayName:'Saturday',  focus:'Rest', muscleGroups:[], isRestDay:true, exercises:[] },
    { dayName:'Sunday',    focus:'Rest', muscleGroups:[], isRestDay:true, exercises:[] },
  ]},
};

// ─── POST /api/ai/generate-split ──────────────────────────
router.post('/generate-split', async (req, res, next) => {
  try {
    const { splitType = 'ppl', daysPerWeek = 6 } = req.body;
    const user = await User.findById(req.user._id);
    const splitNames = { ppl:'Push Pull Legs', upper_lower:'Upper / Lower', bro_split:'Bro Split', full_body:'Full Body' };

    let splitData;
    try {
      const openai = getAI();
      const lines = [
        'You are an expert strength coach. Generate a ' + daysPerWeek + '-day ' + (splitNames[splitType]||splitType) + ' workout split for 7 days (Monday-Sunday).',
        'Athlete profile: Goal=' + (user.goal||'recomp') + ', Experience=' + (user.bio?.fitnessLevel||'intermediate'),
        'PRs (kg): Bench=' + (user.prs?.bench||0) + ' Squat=' + (user.prs?.squat||0) + ' Deadlift=' + (user.prs?.deadlift||0) + ' OHP=' + (user.prs?.ohp||0),
        '',
        'Requirements:',
        '- Exactly 7 day objects in the days array (Monday to Sunday)',
        '- Exactly ' + daysPerWeek + ' training days (isRestDay=false), rest are isRestDay=true',
        '- Each training day has exactly 5 exercises',
        '- Respond with ONLY valid JSON — no markdown, no code fences, no extra text',
        '',
        'JSON format (strictly follow this structure):',
        '{"splitName":"' + (splitNames[splitType]||splitType) + '","splitType":"' + splitType + '","days":[{"dayName":"Monday","focus":"Chest and Triceps","muscleGroups":["chest","arms"],"isRestDay":false,"exercises":[{"name":"Bench Press","sets":4,"repsRange":"6-10","muscleGroup":"chest","notes":"Full ROM"}]},{"dayName":"Tuesday","focus":"Rest","muscleGroups":[],"isRestDay":true,"exercises":[]}]}',
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o', max_tokens: 2000, temperature: 0.3,
        messages: [{ role: 'user', content: lines.join('\n') }],
        response_format: { type: 'json_object' },
      });

      splitData = JSON.parse(completion.choices[0].message.content);
    } catch (aiErr) {
      console.warn('[generate-split] using fallback:', aiErr.message);
      splitData = FALLBACK[splitType] || FALLBACK.ppl;
    }

    // Delete existing and create fresh to avoid unique-index conflicts
    await WorkoutSplit.deleteOne({ user: req.user._id });
    const split = await WorkoutSplit.create({
      ...splitData,
      user: req.user._id,
      aiGenerated: true,
      generatedAt: new Date(),
    });

    res.json({ split });
  } catch (err) {
    console.error('[generate-split ERROR]', err.message, err.stack);
    next(err);
  }
});

// ─── POST /api/ai/generate-calories ───────────────────────
// Generate AI-recommended calorie & macro targets based on goal/stats
router.post('/generate-calories', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const { goal = user.goal, custom = false, customCalories } = req.body;

    // Rule-based calculation (always works, no API key needed)
    const weight   = user.stats?.weightKg || 75;
    const height   = user.stats?.heightCm || 175;
    const age      = user.stats?.age      || 25;
    const level    = user.bio?.fitnessLevel || 'intermediate';

    // Mifflin-St Jeor BMR
    const bmr = 10 * weight + 6.25 * height - 5 * age + 5;

    // Activity multiplier
    const activityMult = level === 'beginner' ? 1.375 : level === 'advanced' ? 1.55 : 1.46;
    const tdee = Math.round(bmr * activityMult);

    let targetCalories, protein, carbs, fat, rationale;

    if (custom && customCalories) {
      targetCalories = Number(customCalories);
      rationale = 'Custom calorie target set by you.';
    } else {
      switch (goal) {
        case 'bulk':
          targetCalories = tdee + 300;
          rationale = 'Caloric surplus of ~300 kcal above TDEE for lean muscle gain.';
          break;
        case 'cut':
          targetCalories = Math.max(tdee - 500, 1200);
          rationale = 'Caloric deficit of ~500 kcal below TDEE for ~0.5kg/week fat loss.';
          break;
        default: // recomp
          targetCalories = tdee;
          rationale = 'Maintenance calories for body recomposition (lose fat, gain muscle).';
      }
    }

    // Macros: protein 2g/kg, fat 25%, rest carbs
    protein = Math.round(weight * 2);
    fat     = Math.round((targetCalories * 0.25) / 9);
    carbs   = Math.round((targetCalories - protein * 4 - fat * 9) / 4);

    // Try to enhance with AI if key available
    let aiInsight = null;
    try {
      const openai = getAI();
      const prompt = [
        'User: Goal=' + goal + ', Weight=' + weight + 'kg, TDEE=' + tdee + 'kcal, Target=' + targetCalories + 'kcal',
        'Give a 2-sentence explanation of WHY these specific numbers were chosen and ONE practical tip.',
        'Respond ONLY in JSON: {"insight": "..."}',
      ].join('\n');
      const c = await openai.chat.completions.create({
        model: 'gpt-4o', max_tokens: 150, temperature: 0.4,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });
      aiInsight = JSON.parse(c.choices[0].message.content).insight;
    } catch (_) { /* AI unavailable, skip */ }

    // Save to user
    await User.findByIdAndUpdate(req.user._id, { dailyCalorieTarget: targetCalories });

    res.json({
      targetCalories, protein, carbs, fat, tdee,
      rationale: aiInsight || rationale,
      goal,
    });
  } catch (err) { next(err); }
});

// ─── GET /api/ai/dashboard-summary ────────────────────────
router.get('/dashboard-summary', async (req, res, next) => {
  try {
    const today  = new Date().toISOString().split('T')[0];
    const cached = await DailySummary.findOne({ user: req.user._id, date: today });
    if (cached) return res.json({ summary: cached });

    const since7  = new Date(Date.now() - 7  * 86400000);
    const since30 = new Date(Date.now() - 30 * 86400000);

    const [workouts, weightLogs, calorieLogs, user] = await Promise.all([
      Workout.find({ user: req.user._id, date: { $gte: since7 } }).sort({ date: -1 }),
      WeightLog.find({ user: req.user._id, date: { $gte: since30 } }).sort({ date: 1 }),
      CalorieLog.find({ user: req.user._id, date: { $gte: since7 } }).sort({ date: -1 }),
      User.findById(req.user._id),
    ]);

    const volByMuscle = {};
    for (const w of workouts)
      for (const e of w.exercises) {
        const vol = e.sets.reduce((s, st) => s + (st.reps||0) * (st.weight||0), 0);
        volByMuscle[e.muscleGroup||'other'] = (volByMuscle[e.muscleGroup||'other']||0) + vol;
      }

    const avgCal = calorieLogs.length
      ? Math.round(calorieLogs.reduce((s, c) => s + c.totalCalories, 0) / calorieLogs.length) : 0;

    let summaryData;
    try {
      const openai = getAI();
      const hasPhotos    = user.physiquePhotos?.length > 0;
      const latestPhotos = hasPhotos ? user.physiquePhotos.slice(-2).map(p => p.url) : [];

      const promptText = [
        'You are an elite AI strength coach inside VibeFit.',
        'Athlete goal=' + user.goal + ' target=' + user.dailyCalorieTarget + 'kcal',
        'Last 7 days: ' + workouts.length + ' workouts, avg calories=' + avgCal + 'kcal',
        'Volume by muscle (kg): ' + JSON.stringify(volByMuscle),
        'Latest weight: ' + (weightLogs.at(-1)?.weightKg||'N/A') + 'kg',
        '',
        'Respond ONLY with valid JSON (no markdown):',
        '{"summary":"4-5 motivational sentences about progress","tips":["training tip","nutrition tip","recovery tip"],"physiqueRating":{"score":7,"feedback":"honest 1-2 sentences"},"weakBodyParts":["muscle1"]}',
      ].join('\n');

      const msgContent = [];
      for (const url of latestPhotos) msgContent.push({ type:'image_url', image_url:{ url } });
      msgContent.push({ type:'text', text: promptText });

      const completion = await openai.chat.completions.create({
        model:'gpt-4o', max_tokens:600, temperature:0.5,
        messages:[{ role:'user', content: msgContent }],
        response_format: { type:'json_object' },
      });
      summaryData = JSON.parse(completion.choices[0].message.content);
    } catch (aiErr) {
      console.warn('[dashboard-summary] fallback:', aiErr.message);
      summaryData = {
        summary: 'Keep pushing — consistency is the key to every physique transformation. You\'ve been showing up, and that alone puts you ahead. Log your meals and workouts daily to unlock personalised AI insights tailored to your exact numbers.',
        tips: [
          'Progressive overload: aim to add 2.5kg to your main lifts every 1-2 weeks',
          'Hit ' + Math.round((user.stats?.weightKg||75) * 2) + 'g of protein daily to support muscle growth',
          'Sleep 7-9 hours — growth hormone peaks during deep sleep',
        ],
        physiqueRating: { score: 7, feedback: 'Add your OpenAI API key to get AI physique feedback from your progress photos.' },
        weakBodyParts: Object.entries(volByMuscle).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]),
      };
    }

    const saved = await DailySummary.findOneAndUpdate(
      { user: req.user._id, date: today },
      { ...summaryData, generatedAt: new Date() },
      { new: true, upsert: true }
    );
    res.json({ summary: saved });
  } catch (err) { next(err); }
});

// ─── GET /api/ai/workout-suggestion ───────────────────────
router.get('/workout-suggestion', async (req, res, next) => {
  try {
    const { muscleGroups = 'chest,back' } = req.query;
    const user = await User.findById(req.user._id);
    let result;
    try {
      const openai = getAI();
      const recent = await Workout.find({ user: req.user._id, date: { $gte: new Date(Date.now()-7*86400000) } }).limit(3);
      const prompt = [
        'Personal trainer for a ' + (user.bio?.fitnessLevel||'intermediate') + ' athlete, goal=' + (user.goal||'recomp'),
        'Today: ' + muscleGroups + ' session | Last 7 days sessions: ' + recent.length,
        'PRs: Bench=' + (user.prs?.bench||0) + 'kg Squat=' + (user.prs?.squat||0) + 'kg DL=' + (user.prs?.deadlift||0) + 'kg',
        'Give 3 specific coaching tips for today\'s session.',
        'Respond ONLY in JSON: {"tips":["tip1","tip2","tip3"],"focusCue":"One powerful motivational sentence."}',
      ].join('\n');
      const c = await openai.chat.completions.create({
        model:'gpt-4o', max_tokens:300, temperature:0.6,
        messages:[{ role:'user', content: prompt }],
        response_format:{ type:'json_object' },
      });
      result = JSON.parse(c.choices[0].message.content);
    } catch (aiErr) {
      console.warn('[workout-suggestion] fallback:', aiErr.message);
      result = {
        tips: [
          'Warm up with 2 progressively heavier sets before your working weight',
          'Focus on the mind-muscle connection — slow the eccentric to 3 seconds',
          'Log every set accurately — tracking progressive overload is the key to growth',
        ],
        focusCue: 'Every rep is a vote for the athlete you are becoming.',
      };
    }
    res.json(result);
  } catch (err) { next(err); }
});

// ─── GET /api/ai/analyze ──────────────────────────────────
router.get('/analyze', async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 7 * 86400000);
    const [workouts, weightLogs, user] = await Promise.all([
      Workout.find({ user: req.user._id, date:{ $gte: since } }).sort({ date: -1 }),
      WeightLog.find({ user: req.user._id, date:{ $gte: since } }).sort({ date: 1 }),
      User.findById(req.user._id),
    ]);

    let analysis;
    try {
      if (!workouts.length) throw new Error('NO_WORKOUTS');
      const openai = getAI();
      const hasPhotos    = user.physiquePhotos?.length > 0;
      const latestPhotos = hasPhotos ? user.physiquePhotos.slice(-2).map(p=>p.url) : [];
      const summary = workouts.map(w=>({ date:w.date.toISOString().split('T')[0], exercises:w.exercises.map(e=>({ name:e.name, muscle:e.muscleGroup, sets:e.sets.map(s=>s.reps+'x'+s.weight+'kg').join(', ') })) }));
      const prompt = [
        'Athlete: Goal=' + (user.goal||'recomp') + ' Target=' + (user.dailyCalorieTarget||2500) + 'kcal',
        'PRs: Bench=' + (user.prs?.bench||0) + ' Squat=' + (user.prs?.squat||0) + ' DL=' + (user.prs?.deadlift||0),
        'Workouts: ' + JSON.stringify(summary),
        'Weights: ' + weightLogs.map(l=>l.weightKg).join(', '),
        'Respond ONLY in JSON (no markdown):',
        '{"stallDetection":{"muscleGroup":"...","reason":"..."},"recommendation":{"type":"volume","action":"...","specifics":"..."},"calorieAdjustment":{"direction":"KEEP","newTarget":' + (user.dailyCalorieTarget||2500) + ',"reason":"..."},"bonusInsight":"..."}',
      ].join('\n');
      const msgContent = [];
      for (const url of latestPhotos) msgContent.push({ type:'image_url', image_url:{ url } });
      msgContent.push({ type:'text', text: prompt });
      const c = await openai.chat.completions.create({
        model:'gpt-4o', max_tokens:600, temperature:0.4,
        messages:[{ role:'user', content: msgContent }],
        response_format:{ type:'json_object' },
      });
      analysis = JSON.parse(c.choices[0].message.content);
    } catch (aiErr) {
      const noWorkouts = aiErr.message === 'NO_WORKOUTS';
      analysis = {
        stallDetection:    { muscleGroup: noWorkouts ? 'N/A' : 'Unknown', reason: noWorkouts ? 'No workouts logged in last 7 days. Start logging to unlock analysis.' : 'Add OpenAI API key for stall detection.' },
        recommendation:    { type:'volume', action: noWorkouts ? 'Log your first workout' : 'Train consistently', specifics: noWorkouts ? 'Go to the Tracker tab and log today\'s session.' : 'Ensure 10-20 sets per muscle group weekly.' },
        calorieAdjustment: { direction:'KEEP', newTarget: user.dailyCalorieTarget||2500, reason: noWorkouts ? 'Log data for 7 days to get calorie recommendations.' : 'Add OpenAI API key for calorie recommendations.' },
        bonusInsight: noWorkouts ? 'Log your first week of workouts to unlock AI coaching.' : 'Add OPENAI_API_KEY to server/.env for personalised analysis.',
      };
    }
    res.json({ analysis });
  } catch (err) { next(err); }
});

export default router;
