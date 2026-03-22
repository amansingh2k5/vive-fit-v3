import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';

const DIRECTION_CONFIG = {
  'KEEP':  { label: 'Keep target',    color: '#00f2ff', icon: '✓' },
  '+200':  { label: '+200 kcal/day',  color: '#adff2f', icon: '↑' },
  '-200':  { label: '-200 kcal/day',  color: '#ff007f', icon: '↓' },
};

export default function AIPage() {
  const { user, patchUser } = useAuth();
  const [analysis,  setAnalysis]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [applying,  setApplying]  = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    setAnalysis(null);
    try {
      const { data } = await api.get('/ai/analyze');
      setAnalysis(data.analysis);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const applyCalories = async () => {
    if (!analysis?.calorieAdjustment) return;
    setApplying(true);
    try {
      await api.patch('/user/calories', { dailyCalorieTarget: analysis.calorieAdjustment.newTarget });
      patchUser({ dailyCalorieTarget: analysis.calorieAdjustment.newTarget });
      toast.success(`Calorie target updated to ${analysis.calorieAdjustment.newTarget} kcal`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setApplying(false);
    }
  };

  const directionCfg = analysis ? DIRECTION_CONFIG[analysis.calorieAdjustment?.direction] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl tracking-wide text-slate-100">AI Coach</h1>
        <p className="text-muted text-sm mt-1">Powered by GPT-4o — analyses your last 7 days</p>
      </div>

      {/* Hero card */}
      <div className="card-glass p-6 border border-electric/20 rounded-2xl text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl"
          style={{ background: 'rgba(0,242,255,0.1)', border: '1px solid rgba(0,242,255,0.2)' }}>
          🤖
        </div>
        <h2 className="font-display text-2xl tracking-wide text-neon-grad mb-2">GPT-4o Analysis</h2>
        <p className="text-muted text-sm mb-5 max-w-sm mx-auto leading-relaxed">
          Sends your last 7 days of workouts, weight logs, and physique photos to OpenAI for a personalised strength and nutrition review.
        </p>

        {/* Data preview */}
        <div className="grid grid-cols-3 gap-3 mb-6 text-left">
          {[
            { label: 'Current goal',    value: user?.goal || '—' },
            { label: 'Calorie target',  value: user?.dailyCalorieTarget ? `${user.dailyCalorieTarget} kcal` : '—' },
            { label: 'Photos uploaded', value: user?.physiquePhotos?.length || 0 },
          ].map(s => (
            <div key={s.label} className="bg-surface rounded-xl p-3">
              <p className="text-xs text-muted mb-1">{s.label}</p>
              <p className="text-sm font-semibold text-slate-100 capitalize">{s.value}</p>
            </div>
          ))}
        </div>

        <button onClick={runAnalysis} disabled={loading} className="btn-electric w-full">
          {loading ? (
            <span className="flex items-center gap-2">
              <Spinner /> Analysing your data…
            </span>
          ) : '⚡ Consult AI Coach'}
        </button>
      </div>

      {/* Loading state */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="card p-6 text-center">
            <div className="flex justify-center gap-1.5 mb-3">
              {[0,1,2,3].map(i => (
                <motion.div key={i}
                  className="w-2 h-2 rounded-full bg-electric"
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
            <p className="text-muted text-sm">
              GPT-4o is reviewing your workouts, weight trend, and physique data…
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis results */}
      <AnimatePresence>
        {analysis && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-4">

            {/* Stall detection */}
            <div className="card p-5 border-l-2" style={{ borderColor: '#ff007f' }}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
                  style={{ background: 'rgba(255,0,127,0.12)' }}>🚨</div>
                <div>
                  <p className="text-xs font-bold text-pink uppercase tracking-widest mb-1">Stall Detected</p>
                  <p className="font-semibold text-slate-100 mb-1 capitalize">
                    {analysis.stallDetection?.muscleGroup}
                  </p>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {analysis.stallDetection?.reason}
                  </p>
                </div>
              </div>
            </div>

            {/* Volume / Intensity recommendation */}
            <div className="card p-5 border-l-2" style={{ borderColor: '#adff2f' }}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
                  style={{ background: 'rgba(173,255,47,0.12)' }}>💡</div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs font-bold text-neon uppercase tracking-widest">Recommendation</p>
                    <span className="text-xs px-2 py-0.5 rounded-full capitalize font-semibold"
                      style={{ background: 'rgba(173,255,47,0.12)', color: '#adff2f' }}>
                      {analysis.recommendation?.type}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-100 mb-1">{analysis.recommendation?.action}</p>
                  <p className="text-sm text-slate-400 leading-relaxed">{analysis.recommendation?.specifics}</p>
                </div>
              </div>
            </div>

            {/* Calorie adjustment */}
            {directionCfg && (
              <div className="card p-5 border-l-2" style={{ borderColor: directionCfg.color }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-base"
                    style={{ background: `${directionCfg.color}15`, color: directionCfg.color }}>
                    {directionCfg.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold uppercase tracking-widest"
                        style={{ color: directionCfg.color }}>Calorie Adjustment</p>
                      <span className="font-display text-lg" style={{ color: directionCfg.color }}>
                        {analysis.calorieAdjustment?.newTarget?.toLocaleString()} kcal
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-100 mb-1">{directionCfg.label}</p>
                    <p className="text-sm text-slate-400 leading-relaxed mb-3">
                      {analysis.calorieAdjustment?.reason}
                    </p>
                    {analysis.calorieAdjustment?.newTarget !== user?.dailyCalorieTarget && (
                      <button onClick={applyCalories} disabled={applying} className="btn-neon text-xs px-4 py-2">
                        {applying ? 'Applying…' : `Apply ${analysis.calorieAdjustment?.newTarget?.toLocaleString()} kcal target`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bonus insight */}
            {analysis.bonusInsight && (
              <div className="card p-5 border-l-2" style={{ borderColor: '#00f2ff' }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
                    style={{ background: 'rgba(0,242,255,0.12)' }}>⭐</div>
                  <div>
                    <p className="text-xs font-bold text-electric uppercase tracking-widest mb-1">Bonus Insight</p>
                    <p className="text-sm text-slate-400 leading-relaxed">{analysis.bonusInsight}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Re-run */}
            <button onClick={runAnalysis} className="btn-ghost w-full text-sm">
              ↻ Run Analysis Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
