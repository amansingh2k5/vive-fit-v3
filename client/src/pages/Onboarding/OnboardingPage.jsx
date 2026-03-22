import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { statsSchema, prSchema, goalSchema } from '../../lib/validators';

const STEPS = ['Stats', 'PRs', 'Photos', 'Goal'];
const PR_FIELDS = [
  { name: 'bench',       label: 'Bench Press',     color: '#ff007f' },
  { name: 'squat',       label: 'Squat',            color: '#adff2f' },
  { name: 'deadlift',    label: 'Deadlift',         color: '#00f2ff' },
  { name: 'ohp',         label: 'Overhead Press',   color: '#adff2f' },
  { name: 'latPulldown', label: 'Lat Pull-down',    color: '#00f2ff' },
];

const GOALS = [
  { value: 'bulk',   label: 'Bulk',   desc: 'Build muscle & strength',     emoji: '🏋️', color: '#adff2f' },
  { value: 'cut',    label: 'Cut',    desc: 'Lose fat, preserve muscle',   emoji: '🔥', color: '#ff007f' },
  { value: 'recomp', label: 'Recomp', desc: 'Lose fat & gain muscle',      emoji: '⚡', color: '#00f2ff' },
];

export default function OnboardingPage() {
  const [step,           setStep]           = useState(0);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [uploading,      setUploading]      = useState(false);
  const [selectedGoal,   setSelectedGoal]   = useState(null);
  const fileRef = useRef(null);
  const { patchUser } = useAuth();
  const navigate = useNavigate();

  const statsForm = useForm({ resolver: zodResolver(statsSchema) });
  const prForm    = useForm({ resolver: zodResolver(prSchema) });

  // ── Step 1: Stats ─────────────────────────────────────────
  const onStats = statsForm.handleSubmit(async data => {
    try {
      await api.put('/user/stats', data);
      setStep(1);
    } catch (e) { toast.error(e.message); }
  });

  // ── Step 2: PRs ───────────────────────────────────────────
  const onPRs = prForm.handleSubmit(async data => {
    try {
      const { data: res } = await api.put('/user/prs', data);
      patchUser({ prs: res.prs, strengthScore: res.strengthScore });
      setStep(2);
    } catch (e) { toast.error(e.message); }
  });

  // ── Step 3: Photo upload ───────────────────────────────────
  const handlePhotoUpload = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (uploadedPhotos.length >= 3) return toast.error('Maximum 3 photos for onboarding');

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const { data } = await api.post('/upload/physique', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadedPhotos(prev => [...prev, data.photo]);
      toast.success('Photo uploaded!');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  // ── Step 4: Goal → complete onboarding ───────────────────
  const onGoal = async () => {
    if (!selectedGoal) return toast.error('Please select a goal');
    try {
      await api.put('/user/goal', { goal: selectedGoal });
      patchUser({ goal: selectedGoal, onboardingComplete: true });
      toast.success('Setup complete! Time to lift. 💪');
      navigate('/dashboard');
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-display text-5xl tracking-widest text-neon-grad mb-2">VIBEFIT</h1>
        <p className="text-muted text-sm">Let's get you set up — {STEPS.length - step} steps remaining</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
              i < step  ? 'text-bg' :
              i === step ? 'text-bg' : 'border border-white/20 text-muted'
            }`}
              style={i <= step ? { background: i < step ? '#adff2f' : 'linear-gradient(135deg,#adff2f,#00f2ff)' } : {}}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-neon' : 'text-muted'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`w-8 h-px ${i < step ? 'bg-neon/50' : 'bg-white/10'}`} />}
          </div>
        ))}
      </div>

      {/* Step panels */}
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">

          {/* ── STEP 0: Stats ─────────────────────────────── */}
          {step === 0 && (
            <motion.div key="stats" initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-40 }}>
              <div className="card p-8">
                <h2 className="font-display text-2xl tracking-wide mb-1">Your Stats</h2>
                <p className="text-muted text-sm mb-6">We use this to calculate your strength score</p>
                <form onSubmit={onStats} className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { name: 'age',      label: 'Age',       placeholder: '25',  unit: 'yrs' },
                      { name: 'heightCm', label: 'Height',    placeholder: '178', unit: 'cm'  },
                      { name: 'weightKg', label: 'Weight',    placeholder: '80',  unit: 'kg'  },
                    ].map(f => (
                      <div key={f.name}>
                        <label className="label">{f.label}</label>
                        <div className="relative">
                          <input className="input pr-8" type="number" placeholder={f.placeholder}
                            {...statsForm.register(f.name)} />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{f.unit}</span>
                        </div>
                        {statsForm.formState.errors[f.name] && (
                          <p className="text-xs text-pink mt-1">{statsForm.formState.errors[f.name].message}</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <button type="submit" className="btn-neon w-full mt-2"
                    disabled={statsForm.formState.isSubmitting}>Continue →</button>
                </form>
              </div>
            </motion.div>
          )}

          {/* ── STEP 1: PRs ───────────────────────────────── */}
          {step === 1 && (
            <motion.div key="prs" initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-40 }}>
              <div className="card p-8">
                <h2 className="font-display text-2xl tracking-wide mb-1">Your PRs</h2>
                <p className="text-muted text-sm mb-6">Enter your personal records in kg (use 0 if you haven't done that lift)</p>
                <form onSubmit={onPRs} className="space-y-3">
                  {PR_FIELDS.map(f => (
                    <div key={f.name} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: f.color }} />
                      <label className="text-sm font-medium text-slate-300 w-36 flex-shrink-0">{f.label}</label>
                      <div className="relative flex-1">
                        <input className="input pr-8 text-right" type="number" placeholder="0"
                          step="2.5" min="0" {...prForm.register(f.name)} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">kg</span>
                      </div>
                      {prForm.formState.errors[f.name] && (
                        <p className="text-xs text-pink">{prForm.formState.errors[f.name].message}</p>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-3 mt-4">
                    <button type="button" className="btn-ghost flex-1" onClick={() => setStep(0)}>← Back</button>
                    <button type="submit"  className="btn-neon flex-1"
                      disabled={prForm.formState.isSubmitting}>Continue →</button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: Photos ────────────────────────────── */}
          {step === 2 && (
            <motion.div key="photos" initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-40 }}>
              <div className="card p-8">
                <h2 className="font-display text-2xl tracking-wide mb-1">Physique Photos</h2>
                <p className="text-muted text-sm mb-6">Optional — the AI coach uses these to track your visual progress over time</p>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  {uploadedPhotos.map((p, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden border border-neon/30">
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {uploadedPhotos.length < 3 && (
                    <button onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="aspect-square rounded-xl border-2 border-dashed border-white/20 hover:border-neon/50 flex flex-col items-center justify-center gap-2 text-muted hover:text-neon transition-all">
                      {uploading ? (
                        <span className="text-xs">Uploading…</span>
                      ) : (
                        <>
                          <span className="text-2xl">+</span>
                          <span className="text-xs">Add photo</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

                <div className="flex gap-3">
                  <button className="btn-ghost flex-1" onClick={() => setStep(1)}>← Back</button>
                  <button className="btn-neon flex-1" onClick={() => setStep(3)}>
                    {uploadedPhotos.length === 0 ? 'Skip →' : 'Continue →'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Goal ──────────────────────────────── */}
          {step === 3 && (
            <motion.div key="goal" initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-40 }}>
              <div className="card p-8">
                <h2 className="font-display text-2xl tracking-wide mb-1">Your Goal</h2>
                <p className="text-muted text-sm mb-6">This determines how the AI adjusts your calorie targets</p>

                <div className="space-y-3 mb-6">
                  {GOALS.map(g => (
                    <button key={g.value} onClick={() => setSelectedGoal(g.value)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                        selectedGoal === g.value
                          ? 'bg-surface2' : 'border-white/10 bg-transparent hover:border-white/20'
                      }`}
                      style={selectedGoal === g.value ? { borderColor: g.color, boxShadow: `0 0 16px ${g.color}30` } : {}}>
                      <span className="text-2xl">{g.emoji}</span>
                      <div>
                        <p className="font-semibold text-slate-100" style={selectedGoal === g.value ? { color: g.color } : {}}>
                          {g.label}
                        </p>
                        <p className="text-xs text-muted">{g.desc}</p>
                      </div>
                      <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedGoal === g.value ? 'border-current' : 'border-white/20'
                      }`} style={selectedGoal === g.value ? { borderColor: g.color } : {}}>
                        {selectedGoal === g.value && (
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: g.color }} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button className="btn-ghost flex-1" onClick={() => setStep(2)}>← Back</button>
                  <button className="btn-neon flex-1" onClick={onGoal} disabled={!selectedGoal}>
                    Let's Go! 💪
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
