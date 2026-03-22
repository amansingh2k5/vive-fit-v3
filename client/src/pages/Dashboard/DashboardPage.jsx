import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { weightLogSchema } from '../../lib/validators';

const GOAL_CFG = {
  bulk:   { label: 'Bulk Phase',  color: '#adff2f', emoji: '🏋️' },
  cut:    { label: 'Cut Phase',   color: '#ff007f', emoji: '🔥' },
  recomp: { label: 'Recomp',      color: '#00f2ff', emoji: '⚡' },
};

const MUSCLE_MAX = { bench: 200, squat: 300, deadlift: 350, ohp: 130, latPulldown: 200 };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#1e293b', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'8px 12px', fontSize:12 }}>
      <p style={{ color:'#64748b', marginBottom:4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, margin:'2px 0' }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const { user, patchUser } = useAuth();
  const [weightLogs,    setWeightLogs]    = useState([]);
  const [calorieLogs,   setCalorieLogs]   = useState([]);
  const [prHistory,     setPrHistory]     = useState([]);
  const [recentWorkouts,setRecentWorkouts]= useState([]);
  const [aiSummary,     setAiSummary]     = useState(null);
  const [loadingAI,     setLoadingAI]     = useState(false);
  const [photoTab,      setPhotoTab]      = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const fileRef = useRef(null);

  const { register, handleSubmit, reset, formState:{ isSubmitting } } =
    useForm({ resolver: zodResolver(weightLogSchema) });

  useEffect(() => {
    Promise.all([
      api.get('/weight?days=30'),
      api.get('/calories?days=30'),
      api.get('/workouts?limit=5'),
      api.get('/user/profile'),
    ]).then(([w, c, wk, u]) => {
      setWeightLogs(w.data.logs || []);
      setCalorieLogs(c.data.logs || []);
      setRecentWorkouts(wk.data.workouts || []);
      if (u.data.prHistory) setPrHistory(u.data.prHistory);
    }).catch(() => {});
  }, []);

  const loadAISummary = async () => {
    setLoadingAI(true);
    try {
      const { data } = await api.get('/ai/dashboard-summary');
      setAiSummary(data.summary);
    } catch (e) { toast.error(e.message); }
    finally { setLoadingAI(false); }
  };

  const onLogWeight = handleSubmit(async data => {
    try {
      const { data: res } = await api.post('/weight', { weightKg: data.weightKg });
      setWeightLogs(prev => {
        const today = new Date().toDateString();
        return [...prev.filter(l => new Date(l.date).toDateString() !== today), res.log]
          .sort((a, b) => new Date(a.date) - new Date(b.date));
      });
      patchUser({ stats: { ...user?.stats, weightKg: data.weightKg } });
      toast.success(`Weight logged: ${data.weightKg} kg`);
      reset();
    } catch (e) { toast.error(e.message); }
  });

  const handlePhotoUpload = async e => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('photo', file);
      const { data } = await api.post('/upload/physique', fd, { headers:{ 'Content-Type':'multipart/form-data' } });
      patchUser({ physiquePhotos: data.allPhotos });
      toast.success('Photo uploaded!');
    } catch (e) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const goalCfg = GOAL_CFG[user?.goal] || GOAL_CFG.recomp;

  // Merge weight + calorie logs into one chart dataset
  const weightChartData = weightLogs.map(l => ({
    date:   new Date(l.date).toLocaleDateString('en-US', { month:'short', day:'numeric' }),
    weight: l.weightKg,
  }));

  const calorieChartData = calorieLogs.map(l => ({
    date:     new Date(l.date).toLocaleDateString('en-US', { month:'short', day:'numeric' }),
    calories: l.totalCalories,
    target:   user?.dailyCalorieTarget || 2500,
  })).reverse();

  // Strength trend: score from each PR snapshot
  const strengthChartData = prHistory.map(s => {
    const raw = (s.bench||0)*1.0 + (s.squat||0)*1.2 + (s.deadlift||0)*1.3 + (s.ohp||0)*0.8 + (s.latPulldown||0)*0.7;
    return { date: s.date, score: Math.min(Math.round(raw/8), 1000) };
  });

  // Volume by muscle from recent workouts
  const muscleVolume = {};
  recentWorkouts.forEach(w => {
    w.exercises?.forEach(e => {
      const mg = e.muscleGroup || 'other';
      const vol = e.sets?.reduce((s, st) => s + (st.reps||0)*(st.weight||0), 0) || 0;
      muscleVolume[mg] = (muscleVolume[mg] || 0) + vol;
    });
  });
  const muscleBarData = Object.entries(muscleVolume)
    .map(([name, vol]) => ({ name: name.charAt(0).toUpperCase()+name.slice(1), vol: Math.round(vol) }))
    .sort((a,b) => b.vol - a.vol);

  const weakBodyParts = aiSummary?.weakBodyParts || muscleBarData.slice(-2).map(m => m.name);

  return (
    <div className="space-y-5 pb-4">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-wide">GM, {user?.name?.split(' ')[0]} {goalCfg.emoji}</h1>
          <p className="text-muted text-sm mt-1">{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold"
            style={{ borderColor:`${goalCfg.color}50`, color:goalCfg.color, background:`${goalCfg.color}12` }}>
            {goalCfg.label}
          </span>
          <button onClick={() => { setPhotoTab(v=>!v); }} className="btn-ghost text-xs px-3 py-1.5">
            📷 Photos
          </button>
        </div>
      </div>

      {/* ── Physique photo panel ────────────────────────────── */}
      <AnimatePresence>
        {photoTab && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            className="card p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="label">Physique Photos</p>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="btn-neon text-xs px-3 py-1.5">
                {uploading ? 'Uploading…' : '+ Upload'}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            {user?.physiquePhotos?.length ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[...user.physiquePhotos].reverse().map((p, i) => (
                  <img key={i} src={p.url} alt="" className="h-32 w-24 object-cover rounded-xl flex-shrink-0 border border-white/10" />
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm text-center py-4">No photos yet — upload your first progress photo</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top stat cards ──────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label:'Strength Score', value: user?.strengthScore || '—', color:'#adff2f', sub: user?.strengthScore ? `${user.strengthScore}/1000` : 'Log PRs' },
          { label:'Body Weight',    value: user?.stats?.weightKg ? `${user.stats.weightKg}kg` : '—', color:'#00f2ff', sub: weightLogs.length>=2 ? `${(weightLogs.at(-1).weightKg - weightLogs[0].weightKg).toFixed(1)}kg trend` : 'Log daily' },
          { label:'Calorie Target', value: user?.dailyCalorieTarget?.toLocaleString() || '—', color:'#ff007f', sub:'AI-managed' },
        ].map(s => (
          <motion.div key={s.label} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-1">{s.label}</p>
            <p className="font-display text-3xl tracking-wide" style={{color:s.color}}>{s.value}</p>
            <p className="text-xs text-muted mt-0.5">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Weight log input ────────────────────────────────── */}
      <div className="card p-4">
        <p className="label mb-2">Log today's weight</p>
        <form onSubmit={onLogWeight} className="flex gap-2">
          <div className="relative flex-1">
            <input className="input pr-10" type="number" step="0.1" placeholder={user?.stats?.weightKg || '80.0'} {...register('weightKg')} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">kg</span>
          </div>
          <button type="submit" className="btn-neon" disabled={isSubmitting}>{isSubmitting ? '…' : 'Log'}</button>
        </form>
      </div>

      {/* ── Strength Trend Graph ────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="label">Strength Score Trend</p>
          {strengthChartData.length === 0 && <span className="text-xs text-muted">Update PRs to track</span>}
        </div>
        {strengthChartData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={strengthChartData}>
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="date" tick={{fontSize:10}} tickLine={false}/>
              <YAxis domain={['auto','auto']} tickLine={false} axisLine={false} tick={{fontSize:10}}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Line type="monotone" dataKey="score" name="Score" stroke="#adff2f" strokeWidth={2.5}
                dot={{fill:'#adff2f',r:3,strokeWidth:0}} activeDot={{r:5,fill:'#adff2f'}}/>
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-32 flex flex-col items-center justify-center gap-2 text-muted text-sm">
            <span className="text-3xl">📈</span>Update your PRs over time to see your strength trend
          </div>
        )}
      </div>

      {/* ── Weight + Calorie Chart ──────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="label mb-4">Weight Trend (30 days)</p>
          {weightChartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={weightChartData}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="date" tick={{fontSize:9}} tickLine={false} interval="preserveStartEnd"/>
                <YAxis domain={['auto','auto']} tickLine={false} axisLine={false} tick={{fontSize:9}} tickFormatter={v=>`${v}kg`}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Line type="monotone" dataKey="weight" name="Weight" stroke="#00f2ff" strokeWidth={2}
                  dot={{fill:'#00f2ff',r:2,strokeWidth:0}}/>
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState icon="⚖️" text="Log weight daily to see trend"/>}
        </div>

        <div className="card p-5">
          <p className="label mb-4">Calories vs Target</p>
          {calorieChartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={calorieChartData.slice(-10)}>
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis dataKey="date" tick={{fontSize:9}} tickLine={false}/>
                <YAxis tickLine={false} axisLine={false} tick={{fontSize:9}}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="calories" name="Eaten" fill="#ff007f" radius={[4,4,0,0]} fillOpacity={0.8}/>
                <Bar dataKey="target" name="Target" fill="rgba(255,255,255,0.1)" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState icon="🍽️" text="Log meals in Workout tab to track calories"/>}
        </div>
      </div>

      {/* ── Volume by Muscle ────────────────────────────────── */}
      {muscleBarData.length > 0 && (
        <div className="card p-5">
          <p className="label mb-4">Volume by Muscle (Last 5 Workouts)</p>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={muscleBarData} layout="vertical">
              <XAxis type="number" tick={{fontSize:9}} tickLine={false} axisLine={false}/>
              <YAxis type="category" dataKey="name" tick={{fontSize:10}} tickLine={false} width={72}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="vol" name="Volume (kg)" radius={[0,6,6,0]}
                fill="url(#neonGrad)"/>
              <defs>
                <linearGradient id="neonGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#adff2f" stopOpacity={0.6}/>
                  <stop offset="100%" stopColor="#00f2ff"/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
          {weakBodyParts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-muted">Needs more work:</span>
              {weakBodyParts.map(p => (
                <span key={p} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{background:'rgba(255,0,127,0.12)',color:'#ff007f'}}>⚠️ {p}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Current Split Preview ───────────────────────────── */}
      <SplitPreviewCard/>

      {/* ── Recent Workouts ─────────────────────────────────── */}
      {recentWorkouts.length > 0 && (
        <div className="card p-5">
          <p className="label mb-3">Recent Workouts</p>
          <div className="space-y-3">
            {recentWorkouts.map(w => (
              <div key={w._id} className="flex items-start justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    {new Date(w.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {w.exercises?.map(e=>e.name).slice(0,3).join(' · ')}
                    {w.exercises?.length > 3 ? ` +${w.exercises.length-3}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-neon font-semibold">{w.totalSets} sets</p>
                  <p className="text-xs text-muted">{(w.totalVolume||0).toLocaleString()} kg vol</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AI Daily Summary ────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="label">AI Daily Summary</p>
          <button onClick={loadAISummary} disabled={loadingAI}
            className="btn-electric text-xs px-4 py-1.5">
            {loadingAI ? (
              <span className="flex items-center gap-1.5"><Spinner/> Generating…</span>
            ) : aiSummary ? '↻ Refresh' : '⚡ Generate'}
          </button>
        </div>

        {loadingAI && (
          <div className="flex justify-center gap-1.5 py-6">
            {[0,1,2,3].map(i => (
              <motion.div key={i} className="w-2 h-2 rounded-full bg-electric"
                animate={{y:[0,-8,0]}} transition={{duration:0.8,repeat:Infinity,delay:i*0.15}}/>
            ))}
          </div>
        )}

        {aiSummary && !loadingAI && (
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-4">
            {/* Physique Rating */}
            {aiSummary.physiqueRating && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{background:'rgba(173,255,47,0.06)'}}>
                <div className="text-center">
                  <div className="font-display text-3xl text-neon">{aiSummary.physiqueRating.score}</div>
                  <div className="text-xs text-muted">/ 10</div>
                </div>
                <div className="w-px h-8 bg-white/10"/>
                <p className="text-sm text-slate-300 flex-1">{aiSummary.physiqueRating.feedback}</p>
              </div>
            )}

            {/* Tips */}
            {aiSummary.tips?.length > 0 && (
              <div className="space-y-2">
                {aiSummary.tips.map((tip, i) => (
                  <div key={i} className="flex gap-2.5 text-sm text-slate-300">
                    <span className="text-electric flex-shrink-0 font-bold">{i+1}.</span>
                    {tip}
                  </div>
                ))}
              </div>
            )}

            {/* Summary paragraph */}
            <div className="border-t border-white/8 pt-4">
              <p className="text-sm text-slate-400 leading-relaxed">{aiSummary.summary}</p>
            </div>
          </motion.div>
        )}

        {!aiSummary && !loadingAI && (
          <div className="text-center py-6">
            <p className="text-4xl mb-2">🤖</p>
            <p className="text-muted text-sm">Click Generate to get your personalised daily briefing</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SplitPreviewCard() {
  const [split, setSplit] = useState(null);
  const today = new Date().getDay(); // 0=Sun
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  useEffect(() => {
    api.get('/split').then(r => setSplit(r.data.split)).catch(()=>{});
  }, []);

  if (!split) return null;

  const todayPlan = split.days?.find(d => d.dayName === dayNames[today]);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="label">Current Split — {split.splitName}</p>
        <span className="text-xs text-electric">{split.aiGenerated ? '🤖 AI Generated' : '✏️ Custom'}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {split.days?.map((day, i) => {
          const isToday = day.dayName === dayNames[today];
          return (
            <div key={i} className={`flex-shrink-0 rounded-xl p-3 border text-center min-w-[80px] ${
              isToday ? 'border-neon/50 bg-neon/8' : 'border-white/8 bg-surface2'
            }`}>
              <p className={`text-xs font-bold mb-1 ${isToday ? 'text-neon' : 'text-muted'}`}>{day.dayName?.slice(0,3)}</p>
              {day.isRestDay ? (
                <p className="text-xs text-muted">Rest</p>
              ) : (
                <p className="text-xs text-slate-300 leading-tight">{day.focus}</p>
              )}
            </div>
          );
        })}
      </div>
      {todayPlan && !todayPlan.isRestDay && (
        <div className="mt-3 pt-3 border-t border-white/8">
          <p className="text-xs text-muted mb-2">Today: <span className="text-slate-200 font-semibold">{todayPlan.focus}</span></p>
          <div className="flex flex-wrap gap-1.5">
            {todayPlan.exercises?.slice(0,4).map((e,i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-surface2 border border-white/8 text-slate-300">
                {e.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="h-32 flex flex-col items-center justify-center gap-2 text-muted text-sm">
      <span className="text-2xl">{icon}</span>{text}
    </div>
  );
}

function Spinner() {
  return <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
  </svg>;
}
