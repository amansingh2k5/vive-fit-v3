import { useState, useEffect } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { workoutSchema } from '../../lib/validators';
import { useAuth } from '../../context/AuthContext';

const TABS = ['Workout', 'Calories'];
const MUSCLE_GROUPS = ['chest','back','legs','shoulders','arms','core','cardio','other'];
const MUSCLE_COLORS = { chest:'#ff007f', back:'#adff2f', legs:'#00f2ff', shoulders:'#ff007f', arms:'#adff2f', core:'#00f2ff', cardio:'#fbbf24', other:'#64748b' };
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const SPLIT_OPTIONS = [
  { value:'ppl',         label:'Push / Pull / Legs', desc:'6-day classic', emoji:'⚡' },
  { value:'upper_lower', label:'Upper / Lower',      desc:'4-day balanced', emoji:'🔄' },
  { value:'bro_split',   label:'Bro Split',          desc:'5-day isolation', emoji:'💪' },
  { value:'full_body',   label:'Full Body',          desc:'3-day compound', emoji:'🏋️' },
  { value:'custom',      label:'Custom Split',       desc:'Build your own', emoji:'✏️' },
];

// ── Exercise Card ─────────────────────────────────────────────────────────────
function ExerciseCard({ exIndex, register, control, remove, errors }) {
  const { fields: sets, append: addSet, remove: removeSet } = useFieldArray({ control, name: `exercises.${exIndex}.sets` });
  const mg = useWatch({ control, name: `exercises.${exIndex}.muscleGroup` }) || 'other';

  return (
    <motion.div layout initial={{ opacity:0,y:16 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,scale:0.95 }} className="card p-4">
      <div className="flex gap-2 mb-3">
        <div className="flex-1 space-y-2">
          <input className="input font-semibold" placeholder="Exercise name" {...register(`exercises.${exIndex}.name`)} />
          <select className="input text-sm" {...register(`exercises.${exIndex}.muscleGroup`)}>
            {MUSCLE_GROUPS.map(g => <option key={g} value={g} style={{ background:'#1e293b' }}>{g.charAt(0).toUpperCase()+g.slice(1)}</option>)}
          </select>
        </div>
        <div className="flex items-start pt-1 gap-2">
          <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: MUSCLE_COLORS[mg] }} />
          <button type="button" onClick={() => remove(exIndex)} className="text-muted hover:text-pink text-xl leading-none">×</button>
        </div>
      </div>

      <div className="grid gap-y-1.5 mb-2" style={{ gridTemplateColumns:'26px 1fr 1fr 1fr auto' }}>
        {['#','Reps','Weight','RPE',''].map((h,i) => (
          <div key={i} className="text-xs text-muted uppercase tracking-wider text-center pb-1">{h}</div>
        ))}
        <AnimatePresence>
          {sets.map((s, si) => (
            <motion.div key={s.id} className="contents" initial={{ opacity:0 }} animate={{ opacity:1 }}>
              <div className="flex items-center justify-center text-xs text-muted font-semibold">{si+1}</div>
              <input className="input text-center text-sm py-2 mx-0.5" type="number" min="1" max="200" placeholder="8"
                {...register(`exercises.${exIndex}.sets.${si}.reps`)} />
              <input className="input text-center text-sm py-2 mx-0.5" type="number" min="0" step="2.5" placeholder="60"
                {...register(`exercises.${exIndex}.sets.${si}.weight`)} />
              <input className="input text-center text-sm py-2 mx-0.5" type="number" min="1" max="10" step="0.5" placeholder="—"
                {...register(`exercises.${exIndex}.sets.${si}.rpe`)} />
              <button type="button" onClick={() => removeSet(si)} className="text-muted hover:text-pink pl-1 text-base">×</button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {errors?.exercises?.[exIndex]?.sets && (
        <p className="text-xs text-pink mb-2">Each set needs valid reps and weight</p>
      )}

      <button type="button" onClick={() => addSet({ reps:'', weight:'', rpe:'' })}
        className="w-full py-1.5 text-xs border border-dashed border-white/12 hover:border-neon/40 text-muted hover:text-neon rounded-lg transition-all">
        + Add Set
      </button>
    </motion.div>
  );
}

// ── Custom Split Builder ──────────────────────────────────────────────────────
function CustomSplitBuilder({ onSave, onCancel }) {
  const daysTemplate = DAY_NAMES.slice(1).concat('Sunday').map(d => ({
    dayName: d, focus: '', muscleGroups: [], isRestDay: false, exercises: []
  }));
  const [days, setDays] = useState(daysTemplate);
  const [saving, setSaving] = useState(false);

  const toggleRest = (i) => setDays(prev => prev.map((d, idx) => idx === i ? { ...d, isRestDay: !d.isRestDay } : d));
  const setFocus = (i, val) => setDays(prev => prev.map((d, idx) => idx === i ? { ...d, focus: val } : d));
  const toggleMuscle = (dayIdx, mg) => setDays(prev => prev.map((d, i) => {
    if (i !== dayIdx) return d;
    const mgs = d.muscleGroups.includes(mg) ? d.muscleGroups.filter(m => m !== mg) : [...d.muscleGroups, mg];
    return { ...d, muscleGroups: mgs };
  }));

  const handleSave = async () => {
    const hasTraining = days.some(d => !d.isRestDay);
    if (!hasTraining) return toast.error('Add at least one training day');
    setSaving(true);
    try {
      const { data } = await api.put('/split', { splitType:'custom', splitName:'Custom Split', days });
      toast.success('Custom split saved!');
      onSave(data.split);
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl tracking-wide">Build Custom Split</h3>
        <button onClick={onCancel} className="text-muted text-xs hover:text-slate-300">← Back</button>
      </div>
      <p className="text-muted text-xs">Set each day's focus and muscle groups</p>

      {days.map((day, i) => (
        <div key={day.dayName} className={`card p-3 border ${day.isRestDay ? 'border-white/5 opacity-60' : 'border-white/10'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm">{day.dayName}</span>
            <button type="button" onClick={() => toggleRest(i)}
              className={`text-xs px-3 py-1 rounded-full border transition-all ${day.isRestDay ? 'border-muted text-muted' : 'border-neon/40 text-neon'}`}>
              {day.isRestDay ? 'Rest Day' : 'Training'}
            </button>
          </div>
          {!day.isRestDay && (
            <>
              <input className="input text-sm mb-2" placeholder="e.g. Chest & Triceps"
                value={day.focus} onChange={e => setFocus(i, e.target.value)} />
              <div className="flex flex-wrap gap-1.5">
                {MUSCLE_GROUPS.filter(m => m !== 'other').map(mg => (
                  <button key={mg} type="button" onClick={() => toggleMuscle(i, mg)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all capitalize ${
                      day.muscleGroups.includes(mg)
                        ? 'border-transparent text-bg font-semibold'
                        : 'border-white/15 text-muted hover:border-white/30'
                    }`}
                    style={day.muscleGroups.includes(mg) ? { background: MUSCLE_COLORS[mg] } : {}}>
                    {mg}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ))}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
        <button type="button" onClick={handleSave} disabled={saving} className="btn-neon flex-1">
          {saving ? 'Saving…' : 'Save Split'}
        </button>
      </div>
    </div>
  );
}

// ── Workout Tab ───────────────────────────────────────────────────────────────
function WorkoutTab() {
  const [split,          setSplit]          = useState(null);
  const [aiTips,         setAiTips]         = useState(null);
  const [loadingTips,    setLoadingTips]    = useState(false);
  const [generatingSplit,setGeneratingSplit]= useState(false);
  const [splitModal,     setSplitModal]     = useState(false);
  const [customMode,     setCustomMode]     = useState(false);
  const [selectedType,   setSelectedType]   = useState('ppl');
  const [daysPerWeek,    setDaysPerWeek]    = useState(6);
  const [savedOK,        setSavedOK]        = useState(false);
  const today = DAY_NAMES[new Date().getDay()];

  const { register, control, handleSubmit, reset,
    formState: { isSubmitting, errors } } = useForm({
    resolver: zodResolver(workoutSchema),
    defaultValues: { date: new Date().toISOString().split('T')[0], exercises: [], notes: '' },
  });
  const { fields: exercises, append, remove } = useFieldArray({ control, name: 'exercises' });

  useEffect(() => {
    api.get('/split').then(r => {
      const s = r.data.split;
      setSplit(s);
      if (s) prefillFromSplit(s);
    }).catch(() => {});
  }, []);

  const prefillFromSplit = (sp) => {
    const todayPlan = sp.days?.find(d => d.dayName === today);
    if (!todayPlan || todayPlan.isRestDay) return;
    const exs = (todayPlan.exercises || []).map(e => ({
      name: e.name || '', muscleGroup: e.muscleGroup || 'other',
      sets: [{ reps: '', weight: '', rpe: '' }],
    }));
    if (exs.length > 0) reset({ date: new Date().toISOString().split('T')[0], exercises: exs, notes: '' });
  };

  const loadAITips = async () => {
    const todayPlan = split?.days?.find(d => d.dayName === today);
    if (!todayPlan || todayPlan.isRestDay) return toast('No training planned today', { icon: '😴' });
    setLoadingTips(true);
    try {
      const mgs = (todayPlan.muscleGroups || []).join(',') || 'all';
      const { data } = await api.get('/ai/workout-suggestion?muscleGroups=' + mgs);
      setAiTips(data);
    } catch (e) { toast.error(e.message); }
    finally { setLoadingTips(false); }
  };

  const generateAISplit = async () => {
    setGeneratingSplit(true);
    try {
      const { data } = await api.post('/ai/generate-split', { splitType: selectedType, daysPerWeek });
      setSplit(data.split);
      setSplitModal(false);
      setCustomMode(false);
      prefillFromSplit(data.split);
      toast.success('Split generated!');
    } catch (e) { toast.error(e.message); }
    finally { setGeneratingSplit(false); }
  };

  const onSubmit = handleSubmit(async data => {
    // Clean RPE: remove empty strings
    const cleaned = {
      ...data,
      exercises: data.exercises.map(ex => ({
        ...ex,
        sets: ex.sets.map(s => ({
          reps:   Number(s.reps),
          weight: Number(s.weight),
          ...(s.rpe !== '' && s.rpe !== null && s.rpe !== undefined ? { rpe: Number(s.rpe) } : {}),
        })),
      })),
    };
    try {
      await api.post('/workouts', cleaned);
      toast.success('Workout saved! 💪');
      setSavedOK(true);
      reset({ date: new Date().toISOString().split('T')[0], exercises: [], notes: '' });
      if (split) prefillFromSplit(split);
      setTimeout(() => setSavedOK(false), 3000);
    } catch (e) {
      console.error('Save error:', e.message);
      toast.error(e.message);
    }
  }, (formErrors) => {
    console.error('Validation errors:', JSON.stringify(formErrors));
    toast.error('Check your inputs — each set needs valid reps and weight');
  });

  const todayPlan = split?.days?.find(d => d.dayName === today);

  return (
    <div className="space-y-4">
      {/* Split card */}
      <div className="card p-4">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <p className="label">{split ? split.splitName : 'No split set'}</p>
            {todayPlan ? (
              <p className="font-semibold text-slate-200">
                {todayPlan.isRestDay ? '😴 Rest Day — recover well' : 'Today: ' + todayPlan.focus}
              </p>
            ) : <p className="text-muted text-sm">Generate a split to get daily plans</p>}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {split && !todayPlan?.isRestDay && (
              <button onClick={loadAITips} disabled={loadingTips} className="btn-ghost text-xs px-3 py-1.5">
                {loadingTips ? '…' : '🤖 Tips'}
              </button>
            )}
            <button onClick={() => setSplitModal(true)} className="btn-electric text-xs px-3 py-1.5">
              {split ? '↻ Change' : '+ Split'}
            </button>
          </div>
        </div>

        {/* Week strip */}
        {split?.days && (
          <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
            {split.days.map((d, i) => {
              const isToday = d.dayName === today;
              return (
                <div key={i} className={`flex-shrink-0 text-center px-2 py-1.5 rounded-lg border min-w-[52px] ${
                  isToday ? 'border-neon/50 bg-neon/8' : 'border-white/8 bg-surface2'}`}>
                  <p className={`text-xs font-bold ${isToday ? 'text-neon' : 'text-muted'}`}>{d.dayName.slice(0,3)}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-tight">
                    {d.isRestDay ? 'Rest' : (d.focus?.split(/[—&,]/)[0]?.trim() || 'Train')}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Tips */}
      <AnimatePresence>
        {aiTips && (
          <motion.div initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0 }}
            className="card p-4 border border-electric/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-electric font-bold text-xs uppercase tracking-widest">🤖 AI Tips for Today</p>
              <button onClick={() => setAiTips(null)} className="text-xs text-muted hover:text-slate-300">✕</button>
            </div>
            <p className="text-slate-200 text-sm font-medium mb-3 italic">"{aiTips.focusCue}"</p>
            <div className="space-y-1.5">
              {aiTips.tips?.map((t, i) => (
                <div key={i} className="flex gap-2 text-sm text-slate-400">
                  <span className="text-electric font-bold flex-shrink-0">{i+1}.</span>{t}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Today's plan reference */}
      {todayPlan && !todayPlan.isRestDay && todayPlan.exercises?.length > 0 && (
        <div className="card p-4">
          <p className="label mb-2">Today's Plan — {todayPlan.focus}</p>
          <div className="space-y-1.5">
            {todayPlan.exercises.map((e, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: MUSCLE_COLORS[e.muscleGroup] || '#64748b' }} />
                  <span className="text-slate-200">{e.name}</span>
                </div>
                <span className="text-muted text-xs">{e.sets}×{e.repsRange}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logger form */}
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl tracking-wide">Log Workout</h2>
          <input type="date" className="input text-sm py-2 px-3 w-auto"
            max={new Date().toISOString().split('T')[0]} {...register('date')} />
        </div>

        <AnimatePresence>
          {exercises.map((ex, i) => (
            <ExerciseCard key={ex.id} exIndex={i} register={register} control={control} remove={remove} errors={errors} />
          ))}
        </AnimatePresence>

        {exercises.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-3xl mb-2">🏋️</p>
            <p className="text-muted text-sm">
              {todayPlan && !todayPlan.isRestDay
                ? 'Exercises pre-filled from your split — or add custom ones below'
                : 'Add exercises to start logging'}
            </p>
          </div>
        )}

        <button type="button"
          onClick={() => append({ name:'', muscleGroup:'chest', sets:[{ reps:'', weight:'', rpe:'' }] })}
          className="btn-ghost w-full">
          + Add Exercise
        </button>

        {exercises.length > 0 && (
          <>
            <div className="card p-4">
              <label className="label">Session Notes (optional)</label>
              <textarea className="input resize-none" rows={2} placeholder="How did it feel? Any PRs?"
                {...register('notes')} />
            </div>
            <button type="submit" disabled={isSubmitting}
              className={'btn-neon w-full' + (savedOK ? ' animate-pulse-neon' : '')}>
              {isSubmitting ? 'Saving…' : savedOK ? '✓ Saved!' : 'Save Workout'}
            </button>
          </>
        )}
      </form>

      {/* Split Modal */}
      <AnimatePresence>
        {splitModal && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background:'rgba(0,0,0,0.75)' }}
            onClick={e => e.target === e.currentTarget && setSplitModal(false)}>
            <motion.div initial={{ y:40,opacity:0 }} animate={{ y:0,opacity:1 }} exit={{ y:40,opacity:0 }}
              className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" style={{ background:'#1e293b' }}>

              {customMode ? (
                <CustomSplitBuilder
                  onSave={(s) => { setSplit(s); setSplitModal(false); setCustomMode(false); prefillFromSplit(s); }}
                  onCancel={() => setCustomMode(false)}
                />
              ) : (
                <>
                  <h3 className="font-display text-2xl tracking-wide mb-1">Choose Split</h3>
                  <p className="text-muted text-sm mb-4">AI generates exercises based on your PRs and goal</p>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {SPLIT_OPTIONS.map(o => (
                      <button key={o.value} type="button"
                        onClick={() => {
                          if (o.value === 'custom') { setCustomMode(true); return; }
                          setSelectedType(o.value);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          o.value === 'custom'
                            ? 'border-dashed border-white/20 hover:border-neon/40 hover:text-neon'
                            : selectedType === o.value
                              ? 'border-neon/50 bg-neon/8'
                              : 'border-white/10 hover:border-white/20'}`}>
                        <p className="text-lg mb-0.5">{o.emoji}</p>
                        <p className="text-xs font-semibold text-slate-200">{o.label}</p>
                        <p className="text-xs text-muted">{o.desc}</p>
                      </button>
                    ))}
                  </div>

                  {selectedType !== 'custom' && (
                    <>
                      <p className="label mb-2">Training Days / Week</p>
                      <div className="flex gap-2 mb-5">
                        {[3,4,5,6].map(d => (
                          <button key={d} type="button" onClick={() => setDaysPerWeek(d)}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${
                              daysPerWeek === d ? 'bg-neon text-bg border-neon' : 'border-white/10 text-muted hover:border-white/20'}`}>
                            {d}d
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="flex gap-3">
                    <button type="button" onClick={() => setSplitModal(false)} className="btn-ghost flex-1">Cancel</button>
                    <button type="button" onClick={generateAISplit} disabled={generatingSplit} className="btn-neon flex-1">
                      {generatingSplit ? '🤖 Generating…' : '⚡ Generate'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Calorie Tab ───────────────────────────────────────────────────────────────
function CalorieTab() {
  const { user, patchUser } = useAuth();
  const [todayLog,    setTodayLog]    = useState(null);
  const [weekLogs,    setWeekLogs]    = useState([]);
  const [form,        setForm]        = useState({ name:'', calories:'', protein:'', carbs:'', fat:'' });
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState(null);
  const [aiCalModal,  setAiCalModal]  = useState(false);
  const [aiCalResult, setAiCalResult] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [customCals,  setCustomCals]  = useState('');
  const [calMode,     setCalMode]     = useState('ai'); // 'ai' | 'custom'

  const QUICK_MEALS = [
    { name:'Breakfast',    calories:400, protein:25, carbs:50, fat:10 },
    { name:'Lunch',        calories:600, protein:35, carbs:70, fat:18 },
    { name:'Dinner',       calories:700, protein:40, carbs:75, fat:20 },
    { name:'Snack',        calories:200, protein:10, carbs:25, fat:6  },
    { name:'Protein Shake',calories:150, protein:30, carbs:8,  fat:2  },
    { name:'Pre-Workout',  calories:100, protein:5,  carbs:20, fat:1  },
  ];

  useEffect(() => {
    Promise.all([api.get('/calories/today'), api.get('/calories?days=7')])
      .then(([t, w]) => { setTodayLog(t.data.log); setWeekLogs(w.data.logs || []); })
      .catch(() => {});
  }, []);

  const addMeal = async (overrides = {}) => {
    const payload = { ...form, ...overrides };
    if (!payload.name || !payload.calories) return toast.error('Name and calories required');
    setSaving(true);
    try {
      const { data } = await api.post('/calories/meal', {
        name: payload.name, calories: Number(payload.calories),
        protein: Number(payload.protein)||0, carbs: Number(payload.carbs)||0, fat: Number(payload.fat)||0,
      });
      setTodayLog(data.log);
      setForm({ name:'', calories:'', protein:'', carbs:'', fat:'' });
      toast.success('Meal logged!');
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const deleteMeal = async (idx) => {
    setDeleting(idx);
    try {
      const { data } = await api.delete('/calories/meal/' + idx);
      setTodayLog(data.log);
    } catch (e) { toast.error(e.message); }
    finally { setDeleting(null); }
  };

  const generateAICalories = async () => {
    setCalcLoading(true);
    try {
      const payload = calMode === 'custom' && customCals
        ? { custom: true, customCalories: customCals }
        : { custom: false };
      const { data } = await api.post('/ai/generate-calories', payload);
      setAiCalResult(data);
    } catch (e) { toast.error(e.message); }
    finally { setCalcLoading(false); }
  };

  const applyCalories = async () => {
    if (!aiCalResult) return;
    try {
      await api.patch('/user/calories', { dailyCalorieTarget: aiCalResult.targetCalories });
      patchUser({ dailyCalorieTarget: aiCalResult.targetCalories });
      toast.success('Calorie target updated to ' + aiCalResult.targetCalories + ' kcal!');
      setAiCalModal(false);
      setAiCalResult(null);
    } catch (e) { toast.error(e.message); }
  };

  const target    = user?.dailyCalorieTarget || 2500;
  const eaten     = todayLog?.totalCalories  || 0;
  const remaining = target - eaten;
  const pct       = Math.min(100, Math.round((eaten / target) * 100));
  const ringColor = eaten > target ? '#ff007f' : eaten > target * 0.9 ? '#adff2f' : '#00f2ff';
  const weekAvg   = weekLogs.length ? Math.round(weekLogs.reduce((s, l) => s + l.totalCalories, 0) / weekLogs.length) : 0;

  return (
    <div className="space-y-4">
      {/* Today ring */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="label">Today's Calories</p>
          <button onClick={() => setAiCalModal(true)}
            className="btn-electric text-xs px-3 py-1.5">🤖 Set Target</button>
        </div>
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0" style={{ width:100, height:100 }}>
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10"/>
              <circle cx="50" cy="50" r="42" fill="none" stroke={ringColor} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 42 + ''}
                strokeDashoffset={2 * Math.PI * 42 * (1 - pct / 100) + ''}
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset 0.7s ease' }}/>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-xl" style={{ color: ringColor }}>{pct}%</span>
              <span className="text-xs text-muted">of goal</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Eaten</span>
              <span className="font-semibold text-neon">{eaten.toLocaleString()} kcal</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Target</span>
              <span className="font-semibold text-slate-200">{target.toLocaleString()} kcal</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">{remaining >= 0 ? 'Remaining' : 'Over by'}</span>
              <span className={'font-semibold ' + (remaining >= 0 ? 'text-electric' : 'text-pink')}>
                {Math.abs(remaining).toLocaleString()} kcal
              </span>
            </div>
            {todayLog && (
              <div className="flex gap-3 text-xs text-muted pt-1 border-t border-white/8">
                <span>P: <strong className="text-slate-300">{Math.round(todayLog.totalProtein)}g</strong></span>
                <span>C: <strong className="text-slate-300">{Math.round(todayLog.totalCarbs)}g</strong></span>
                <span>F: <strong className="text-slate-300">{Math.round(todayLog.totalFat)}g</strong></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick add */}
      <div className="card p-4">
        <p className="label mb-3">Quick Add</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {QUICK_MEALS.map(m => (
            <button key={m.name} type="button" onClick={() => addMeal(m)}
              className="p-2 rounded-xl border border-white/10 hover:border-neon/40 text-xs text-center transition-all">
              <div className="font-semibold text-slate-200 mb-0.5">{m.name}</div>
              <div className="text-muted">{m.calories} kcal</div>
            </button>
          ))}
        </div>
        <p className="label mb-2">Custom Entry</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input className="input text-sm" placeholder="Meal name" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className="input text-sm" type="number" placeholder="Calories" value={form.calories}
            onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} />
          <input className="input text-sm" type="number" placeholder="Protein (g)" value={form.protein}
            onChange={e => setForm(f => ({ ...f, protein: e.target.value }))} />
          <input className="input text-sm" type="number" placeholder="Carbs (g)" value={form.carbs}
            onChange={e => setForm(f => ({ ...f, carbs: e.target.value }))} />
        </div>
        <button onClick={() => addMeal()} disabled={saving} className="btn-neon w-full">
          {saving ? 'Adding…' : '+ Add Meal'}
        </button>
      </div>

      {/* Meals list */}
      {todayLog?.meals?.length > 0 && (
        <div className="card p-4">
          <p className="label mb-3">Today's Meals</p>
          <div className="space-y-2">
            {todayLog.meals.map((m, i) => (
              <motion.div key={i} layout className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-slate-200">{m.name}</p>
                  <p className="text-xs text-muted">P:{m.protein}g C:{m.carbs}g F:{m.fat}g</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-neon font-semibold text-sm">{m.calories} kcal</span>
                  <button onClick={() => deleteMeal(i)} disabled={deleting === i}
                    className="text-muted hover:text-pink text-lg">{deleting === i ? '…' : '×'}</button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Week stats */}
      {weekLogs.length > 0 && (
        <div className="card p-4">
          <p className="label mb-3">This Week</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-display text-2xl text-neon">{weekAvg.toLocaleString()}</p>
              <p className="text-xs text-muted">Avg kcal/day</p>
            </div>
            <div>
              <p className="font-display text-2xl text-electric">{weekLogs.length}</p>
              <p className="text-xs text-muted">Days logged</p>
            </div>
            <div>
              <p className={'font-display text-2xl ' + (weekAvg > target ? 'text-pink' : 'text-neon')}>
                {weekAvg > target ? '+' : ''}{weekAvg - target}
              </p>
              <p className="text-xs text-muted">vs target</p>
            </div>
          </div>
        </div>
      )}

      {/* AI Calorie Modal */}
      <AnimatePresence>
        {aiCalModal && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background:'rgba(0,0,0,0.75)' }}
            onClick={e => e.target === e.currentTarget && setAiCalModal(false)}>
            <motion.div initial={{ y:40,opacity:0 }} animate={{ y:0,opacity:1 }} exit={{ y:40,opacity:0 }}
              className="card p-6 w-full max-w-sm" style={{ background:'#1e293b' }}>

              <h3 className="font-display text-2xl tracking-wide mb-1">Calorie Target</h3>
              <p className="text-muted text-sm mb-4">Set a goal-based or custom target</p>

              {/* Mode toggle */}
              <div className="flex gap-1 p-1 rounded-xl mb-4" style={{ background:'rgba(255,255,255,0.04)' }}>
                {[{k:'ai',l:'AI Recommended'},{k:'custom',l:'Custom'}].map(t => (
                  <button key={t.k} onClick={() => setCalMode(t.k)}
                    className={'flex-1 py-2 rounded-lg text-xs font-semibold transition-all ' +
                      (calMode === t.k ? 'bg-surface text-neon' : 'text-muted')}>
                    {t.l}
                  </button>
                ))}
              </div>

              {calMode === 'ai' ? (
                <div className="space-y-3 mb-4">
                  <p className="text-sm text-slate-300">AI calculates your TDEE using weight, height, age and activity level, then adjusts for your goal:</p>
                  <div className="space-y-2">
                    {[
                      { goal:'bulk',   label:'Bulk',   desc:'TDEE + 300 kcal',   color:'#adff2f' },
                      { goal:'cut',    label:'Cut',    desc:'TDEE − 500 kcal',   color:'#ff007f' },
                      { goal:'recomp', label:'Recomp', desc:'TDEE (maintenance)', color:'#00f2ff' },
                    ].map(g => (
                      <div key={g.goal} className="flex items-center justify-between px-3 py-2 rounded-xl border border-white/8 bg-surface2">
                        <span className="text-sm font-semibold" style={{ color: g.color }}>{g.label}</span>
                        <span className="text-xs text-muted">{g.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="label">Enter your daily calorie target</label>
                  <div className="relative">
                    <input className="input pr-14" type="number" step="50" min="800" max="10000"
                      placeholder="2500" value={customCals}
                      onChange={e => setCustomCals(e.target.value)} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">kcal</span>
                  </div>
                </div>
              )}

              {/* Result */}
              {aiCalResult && (
                <motion.div initial={{ opacity:0,y:8 }} animate={{ opacity:1,y:0 }}
                  className="mb-4 p-4 rounded-xl border border-neon/30 bg-neon/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted uppercase tracking-wider">Recommended</span>
                    <span className="font-display text-2xl text-neon">{aiCalResult.targetCalories.toLocaleString()}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted mb-2">
                    <span>Protein: <strong className="text-slate-300">{aiCalResult.protein}g</strong></span>
                    <span>Carbs: <strong className="text-slate-300">{aiCalResult.carbs}g</strong></span>
                    <span>Fat: <strong className="text-slate-300">{aiCalResult.fat}g</strong></span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{aiCalResult.rationale}</p>
                </motion.div>
              )}

              <div className="flex gap-3">
                <button onClick={() => { setAiCalModal(false); setAiCalResult(null); }} className="btn-ghost flex-1">Cancel</button>
                {aiCalResult ? (
                  <button onClick={applyCalories} className="btn-neon flex-1">Apply Target</button>
                ) : (
                  <button onClick={generateAICalories} disabled={calcLoading}
                    className="btn-electric flex-1">
                    {calcLoading ? 'Calculating…' : '⚡ Calculate'}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function LoggerPage() {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-4xl tracking-wide">Tracker</h1>
        <p className="text-muted text-sm mt-1">Log workouts and nutrition</p>
      </div>
      <div className="flex gap-1 p-1 rounded-xl" style={{ background:'rgba(255,255,255,0.04)' }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setActiveTab(i)}
            className={'flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ' +
              (activeTab === i ? 'bg-surface text-neon shadow-sm' : 'text-muted hover:text-slate-300')}>
            {i === 0 ? '🏋️ Workout' : '🍽️ Calories'}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity:0,x:12 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-12 }} transition={{ duration:0.18 }}>
          {activeTab === 0 ? <WorkoutTab /> : <CalorieTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
