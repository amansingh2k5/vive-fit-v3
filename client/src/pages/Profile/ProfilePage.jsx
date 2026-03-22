import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';

const profileSchema = z.object({
  name:               z.string().min(2).max(60).optional(),
  goal:               z.enum(['bulk','cut','recomp']).optional(),
  dailyCalorieTarget: z.coerce.number().min(800).max(10000).optional(),
  stats: z.object({
    age:      z.coerce.number().min(13).max(100).optional(),
    heightCm: z.coerce.number().min(100).max(250).optional(),
    weightKg: z.coerce.number().min(30).max(400).optional(),
  }).optional(),
  prs: z.object({
    bench:       z.coerce.number().min(0).max(1000).optional(),
    squat:       z.coerce.number().min(0).max(1500).optional(),
    deadlift:    z.coerce.number().min(0).max(1500).optional(),
    ohp:         z.coerce.number().min(0).max(500).optional(),
    latPulldown: z.coerce.number().min(0).max(600).optional(),
  }).optional(),
  bio: z.object({
    fitnessLevel:   z.enum(['beginner','intermediate','advanced']).optional(),
    yearsTraining:  z.coerce.number().min(0).max(80).optional(),
    injuries:       z.string().max(500).optional(),
    preferredUnits: z.enum(['kg','lbs']).optional(),
  }).optional(),
});

const SECTIONS = ['Profile','Stats','PRs','Photos'];

const GOAL_OPTIONS = [
  { value:'bulk',   label:'Bulk',   emoji:'🏋️', desc:'Build muscle & size' },
  { value:'cut',    label:'Cut',    emoji:'🔥', desc:'Lose fat, keep muscle' },
  { value:'recomp', label:'Recomp', emoji:'⚡', desc:'Body recomposition' },
];

export default function ProfilePage() {
  const { user, patchUser, logout } = useAuth();
  const [section,  setSection]  = useState(0);
  const [saving,   setSaving]   = useState(false);
  const [uploading,setUploading]= useState(false);
  const [deleting, setDeleting] = useState(null);
  const fileRef = useRef(null);

  const { register, handleSubmit, reset, watch, setValue,
    formState:{ errors, isDirty } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name:               user?.name || '',
      goal:               user?.goal || 'recomp',
      dailyCalorieTarget: user?.dailyCalorieTarget || 2500,
      stats: {
        age:      user?.stats?.age      || '',
        heightCm: user?.stats?.heightCm || '',
        weightKg: user?.stats?.weightKg || '',
      },
      prs: {
        bench:       user?.prs?.bench       || '',
        squat:       user?.prs?.squat       || '',
        deadlift:    user?.prs?.deadlift    || '',
        ohp:         user?.prs?.ohp         || '',
        latPulldown: user?.prs?.latPulldown || '',
      },
      bio: {
        fitnessLevel:   user?.bio?.fitnessLevel   || 'intermediate',
        yearsTraining:  user?.bio?.yearsTraining  || '',
        injuries:       user?.bio?.injuries       || '',
        preferredUnits: user?.bio?.preferredUnits || 'kg',
      },
    },
  });

  // Reload if user changes externally
  useEffect(() => { if (user) reset({
    name: user.name, goal: user.goal, dailyCalorieTarget: user.dailyCalorieTarget,
    stats: { age: user.stats?.age||'', heightCm: user.stats?.heightCm||'', weightKg: user.stats?.weightKg||'' },
    prs:   { bench: user.prs?.bench||'', squat: user.prs?.squat||'', deadlift: user.prs?.deadlift||'',
             ohp: user.prs?.ohp||'', latPulldown: user.prs?.latPulldown||'' },
    bio:   { fitnessLevel: user.bio?.fitnessLevel||'intermediate', yearsTraining: user.bio?.yearsTraining||'',
             injuries: user.bio?.injuries||'', preferredUnits: user.bio?.preferredUnits||'kg' },
  }); }, [user]);

  const onSave = handleSubmit(async data => {
    setSaving(true);
    try {
      const res = await api.put('/user/profile', data);
      patchUser(res.data);
      toast.success('Profile updated!');
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
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

  const handleDeletePhoto = async (publicId) => {
    setDeleting(publicId);
    try {
      const encoded = encodeURIComponent(publicId);
      const { data } = await api.delete(`/upload/physique/${encoded}`);
      patchUser({ physiquePhotos: data.allPhotos });
      toast.success('Photo deleted');
    } catch (e) { toast.error(e.message); }
    finally { setDeleting(null); }
  };

  const watchGoal = watch('goal');
  const initials  = user?.name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) || 'VF';

  return (
    <div className="space-y-5">
      {/* Avatar header */}
      <div className="card p-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center font-display text-2xl text-bg flex-shrink-0"
          style={{background:'linear-gradient(135deg,#ff007f,#00f2ff)'}}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-2xl tracking-wide truncate">{user?.name}</h2>
          <p className="text-muted text-sm">{user?.email}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
              style={{background:'rgba(173,255,47,0.12)',color:'#adff2f'}}>{user?.goal} phase</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
              style={{background:'rgba(0,242,255,0.12)',color:'#00f2ff'}}>{user?.bio?.fitnessLevel || 'intermediate'}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{background:'rgba(255,0,127,0.12)',color:'#ff007f'}}>Score: {user?.strengthScore || '—'}</span>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{background:'rgba(255,255,255,0.04)'}}>
        {SECTIONS.map((s,i) => (
          <button key={s} onClick={() => setSection(i)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              section===i ? 'bg-surface text-neon' : 'text-muted hover:text-slate-300'}`}>
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={onSave}>
        <AnimatePresence mode="wait">

          {/* ── Profile section ──────────────────────────────── */}
          {section === 0 && (
            <motion.div key="profile" initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-16}}
              className="space-y-4">
              <div className="card p-5 space-y-4">
                <div>
                  <label className="label">Display Name</label>
                  <input className="input" placeholder="Your name" {...register('name')}/>
                  {errors.name && <p className="text-xs text-pink mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="label">Daily Calorie Target</label>
                  <div className="relative">
                    <input className="input pr-14" type="number" step="50" {...register('dailyCalorieTarget')}/>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">kcal</span>
                  </div>
                </div>

                <div>
                  <label className="label">Fitness Level</label>
                  <select className="input" {...register('bio.fitnessLevel')}>
                    {['beginner','intermediate','advanced'].map(l => (
                      <option key={l} value={l} style={{background:'#1e293b'}} className="capitalize">{l.charAt(0).toUpperCase()+l.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Years Training</label>
                  <input className="input" type="number" min="0" max="80" placeholder="0" {...register('bio.yearsTraining')}/>
                </div>

                <div>
                  <label className="label">Preferred Units</label>
                  <div className="flex gap-2">
                    {['kg','lbs'].map(u => {
                      const w = watch('bio.preferredUnits');
                      return (
                        <button key={u} type="button" onClick={() => setValue('bio.preferredUnits', u, {shouldDirty:true})}
                          className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-all ${
                            w===u ? 'border-neon/60 bg-neon/10 text-neon' : 'border-white/10 text-muted'}`}>
                          {u.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="label">Injuries / Limitations</label>
                  <textarea className="input resize-none" rows={2} placeholder="e.g. bad left knee, shoulder impingement"
                    {...register('bio.injuries')}/>
                </div>
              </div>

              {/* Goal selector */}
              <div className="card p-5">
                <label className="label mb-3">Training Goal</label>
                <div className="space-y-2">
                  {GOAL_OPTIONS.map(g => (
                    <button key={g.value} type="button"
                      onClick={() => setValue('goal', g.value, {shouldDirty:true})}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                        watchGoal===g.value ? '' : 'border-white/10 hover:border-white/20'}`}
                      style={watchGoal===g.value ? {
                        borderColor: g.value==='bulk'?'#adff2f':g.value==='cut'?'#ff007f':'#00f2ff',
                        background:  g.value==='bulk'?'rgba(173,255,47,0.08)':g.value==='cut'?'rgba(255,0,127,0.08)':'rgba(0,242,255,0.08)',
                      } : {}}>
                      <span className="text-xl">{g.emoji}</span>
                      <div>
                        <p className="font-semibold text-slate-100 text-sm">{g.label}</p>
                        <p className="text-xs text-muted">{g.desc}</p>
                      </div>
                      <div className="ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center"
                        style={{borderColor: watchGoal===g.value?(g.value==='bulk'?'#adff2f':g.value==='cut'?'#ff007f':'#00f2ff'):'rgba(255,255,255,0.2)'}}>
                        {watchGoal===g.value && (
                          <div className="w-2 h-2 rounded-full"
                            style={{background: g.value==='bulk'?'#adff2f':g.value==='cut'?'#ff007f':'#00f2ff'}}/>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <SaveBar saving={saving} isDirty={isDirty}/>
            </motion.div>
          )}

          {/* ── Stats section ─────────────────────────────────── */}
          {section === 1 && (
            <motion.div key="stats" initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-16}}
              className="space-y-4">
              <div className="card p-5 space-y-4">
                {[
                  { name:'stats.age',      label:'Age',    unit:'yrs', type:'number', placeholder:'25' },
                  { name:'stats.heightCm', label:'Height', unit:'cm',  type:'number', placeholder:'178' },
                  { name:'stats.weightKg', label:'Weight', unit:'kg',  type:'number', step:'0.1', placeholder:'80.0' },
                ].map(f => (
                  <div key={f.name}>
                    <label className="label">{f.label}</label>
                    <div className="relative">
                      <input className="input pr-12" type={f.type} step={f.step} placeholder={f.placeholder}
                        {...register(f.name)}/>
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{f.unit}</span>
                    </div>
                    {errors.stats?.[f.name.split('.')[1]] && (
                      <p className="text-xs text-pink mt-1">{errors.stats[f.name.split('.')[1]].message}</p>
                    )}
                  </div>
                ))}
              </div>
              <SaveBar saving={saving} isDirty={isDirty}/>
            </motion.div>
          )}

          {/* ── PRs section ───────────────────────────────────── */}
          {section === 2 && (
            <motion.div key="prs" initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-16}}
              className="space-y-4">
              <div className="card p-5 space-y-4">
                <p className="text-sm text-muted">Update when you hit a new PR — changes are saved to your strength history graph</p>
                {[
                  { name:'prs.bench',       label:'Bench Press',    color:'#ff007f' },
                  { name:'prs.squat',       label:'Squat',          color:'#adff2f' },
                  { name:'prs.deadlift',    label:'Deadlift',       color:'#00f2ff' },
                  { name:'prs.ohp',         label:'Overhead Press', color:'#adff2f' },
                  { name:'prs.latPulldown', label:'Lat Pull-down',  color:'#00f2ff' },
                ].map(f => {
                  const key   = f.name.split('.')[1];
                  const curr  = user?.prs?.[key] || 0;
                  return (
                    <div key={f.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{background:f.color}}/>
                          <label className="text-sm font-medium text-slate-300">{f.label}</label>
                        </div>
                        {curr > 0 && <span className="text-xs text-muted">Current: {curr} kg</span>}
                      </div>
                      <div className="relative">
                        <input className="input pr-10 text-right" type="number" step="2.5" min="0"
                          {...register(f.name)}/>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">kg</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-xs text-muted text-center px-4">
                Saving new PRs will update your strength score and add a snapshot to your trend graph
              </div>
              <SaveBar saving={saving} isDirty={isDirty}/>
            </motion.div>
          )}

          {/* ── Photos section ────────────────────────────────── */}
          {section === 3 && (
            <motion.div key="photos" initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-16}}
              className="space-y-4">
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="label">Physique Photos</p>
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="btn-neon text-xs px-4 py-1.5">
                    {uploading ? 'Uploading…' : '+ Upload'}
                  </button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload}/>

                {user?.physiquePhotos?.length ? (
                  <div className="grid grid-cols-3 gap-3">
                    {[...user.physiquePhotos].reverse().map((p, i) => (
                      <div key={i} className="relative group aspect-[3/4] rounded-xl overflow-hidden border border-white/10">
                        <img src={p.url} alt="" className="w-full h-full object-cover"/>
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                          <p className="text-xs text-white text-center">
                            {new Date(p.uploadedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                          </p>
                          <button type="button" onClick={() => handleDeletePhoto(p.publicId)}
                            disabled={deleting === p.publicId}
                            className="text-xs px-3 py-1 rounded-lg bg-pink/80 text-white font-semibold">
                            {deleting === p.publicId ? '…' : 'Delete'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-4xl mb-3">📷</p>
                    <p className="text-muted text-sm mb-1">No photos yet</p>
                    <p className="text-xs text-muted">Upload progress photos — the AI coach uses these for physique feedback</p>
                  </div>
                )}
              </div>

              <div className="card p-4 text-sm text-muted space-y-1.5">
                <p className="font-semibold text-slate-300 mb-2">Tips for progress photos</p>
                <p>• Same time of day, ideally morning</p>
                <p>• Same lighting and location</p>
                <p>• Front, side, and back views</p>
                <p>• Consistent clothing</p>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </form>

      {/* Danger zone */}
      <div className="card p-4 border border-pink/20">
        <p className="label mb-3" style={{color:'#ff007f'}}>Account</p>
        <button onClick={async () => { await logout(); }} className="btn-ghost text-sm w-full text-left"
          style={{color:'#ff007f', borderColor:'rgba(255,0,127,0.3)'}}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

function SaveBar({ saving, isDirty }) {
  if (!isDirty) return null;
  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
      className="sticky bottom-4 z-20">
      <button type="submit" disabled={saving}
        className="btn-neon w-full shadow-neon">
        {saving ? 'Saving…' : 'Save Changes'}
      </button>
    </motion.div>
  );
}
