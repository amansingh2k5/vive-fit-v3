import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { loginSchema, registerSchema, forgotSchema, resetSchema } from '../../lib/validators';
import { useNavigate } from 'react-router-dom';

const VIEWS = { LOGIN: 'login', REGISTER: 'register', FORGOT: 'forgot', OTP: 'otp', RESET: 'reset' };

const slide = {
  initial:  { opacity: 0, x: 24 },
  animate:  { opacity: 1, x: 0 },
  exit:     { opacity: 0, x: -24 },
  transition: { duration: 0.22 },
};

export default function AuthPage() {
  const [view, setView] = useState(VIEWS.LOGIN);
  const [resetEmail, setResetEmail] = useState('');
  const [otpValue, setOtpValue] = useState(['', '', '', '', '', '']);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // ── Login ────────────────────────────────────────────────
  const loginForm = useForm({ resolver: zodResolver(loginSchema) });
  const onLogin = loginForm.handleSubmit(async data => {
    try {
      const user = await login(data.email, data.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.onboardingComplete ? '/dashboard' : '/onboarding');
    } catch (e) { toast.error(e.message); }
  });

  // ── Register ─────────────────────────────────────────────
  const regForm = useForm({ resolver: zodResolver(registerSchema) });
  const onRegister = regForm.handleSubmit(async data => {
    try {
      const user = await register(data.name, data.email, data.password);
      toast.success('Account created! Let\'s set you up.');
      navigate(user.onboardingComplete ? '/dashboard' : '/onboarding');
    } catch (e) { toast.error(e.message); }
  });

  // ── Forgot password ───────────────────────────────────────
  const forgotForm = useForm({ resolver: zodResolver(forgotSchema) });
  const onForgot = forgotForm.handleSubmit(async data => {
    try {
      await api.post('/auth/forgot-password', { email: data.email });
      setResetEmail(data.email);
      toast.success('Reset code sent! Check your email.');
      setView(VIEWS.OTP);
    } catch (e) { toast.error(e.message); }
  });

  // ── OTP input handling ────────────────────────────────────
  const handleOtpChange = (idx, val) => {
    const digits = val.replace(/\D/g, '').slice(-1);
    const next = [...otpValue];
    next[idx] = digits;
    setOtpValue(next);
    if (digits && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
  };
  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otpValue[idx] && idx > 0)
      document.getElementById(`otp-${idx - 1}`)?.focus();
  };
  const confirmOtp = () => {
    const code = otpValue.join('');
    if (code.length < 6) return toast.error('Enter all 6 digits');
    setView(VIEWS.RESET);
  };

  // ── Reset password ────────────────────────────────────────
  const resetForm = useForm({ resolver: zodResolver(resetSchema) });
  const onReset = resetForm.handleSubmit(async data => {
    try {
      await api.post('/auth/reset-password', {
        email: resetEmail, otp: otpValue.join(''), newPassword: data.newPassword,
      });
      toast.success('Password reset! Please log in.');
      setView(VIEWS.LOGIN);
    } catch (e) { toast.error(e.message); }
  });

  return (
    <div className="min-h-screen bg-bg flex flex-col lg:flex-row">
      {/* ── Left hero panel ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Grid background */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(rgba(173,255,47,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(173,255,47,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-20 blur-3xl"
          style={{ background: '#adff2f' }} />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full opacity-20 blur-3xl"
          style={{ background: '#00f2ff' }} />

        <div className="relative z-10 text-center">
          <h1 className="font-display text-8xl tracking-widest mb-4 text-neon-grad">VIBEFIT</h1>
          <p className="text-muted text-lg font-medium mb-8">Your AI-powered strength coach</p>

          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[
              { label: 'Strength Score', value: '847', color: '#adff2f' },
              { label: 'Day Streak',     value: '21',  color: '#00f2ff' },
              { label: 'PRs Set',        value: '12',  color: '#ff007f' },
            ].map(s => (
              <div key={s.label} className="card-glass p-3 text-center">
                <p className="font-display text-2xl" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs text-muted mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right auth panel ─────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <h1 className="font-display text-5xl tracking-widest text-neon-grad">VIBEFIT</h1>
          </div>

          <AnimatePresence mode="wait">

            {/* ─── LOGIN ─────────────────────────────────────── */}
            {view === VIEWS.LOGIN && (
              <motion.div key="login" {...slide}>
                <div className="card p-8">
                  <h2 className="font-display text-3xl tracking-wide mb-1 text-slate-100">Welcome back</h2>
                  <p className="text-muted text-sm mb-7">Log in to your VibeFit account</p>

                  <form onSubmit={onLogin} className="space-y-4">
                    <div>
                      <label className="label">Email</label>
                      <input className="input" type="email" placeholder="you@example.com"
                        {...loginForm.register('email')} />
                      {loginForm.formState.errors.email && (
                        <p className="text-xs text-pink mt-1">{loginForm.formState.errors.email.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="label">Password</label>
                      <input className="input" type="password" placeholder="••••••••"
                        {...loginForm.register('password')} />
                    </div>
                    <button type="submit" className="btn-neon w-full mt-2"
                      disabled={loginForm.formState.isSubmitting}>
                      {loginForm.formState.isSubmitting ? 'Logging in…' : 'Log In'}
                    </button>
                  </form>

                  <button onClick={() => setView(VIEWS.FORGOT)}
                    className="text-xs text-electric hover:underline mt-4 block">
                    Forgot password?
                  </button>

                  <div className="mt-6 pt-6 border-t border-white/8 text-center">
                    <p className="text-sm text-muted">No account?{' '}
                      <button onClick={() => setView(VIEWS.REGISTER)} className="text-neon font-semibold hover:underline">
                        Create one
                      </button>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── REGISTER ──────────────────────────────────── */}
            {view === VIEWS.REGISTER && (
              <motion.div key="register" {...slide}>
                <div className="card p-8">
                  <h2 className="font-display text-3xl tracking-wide mb-1 text-slate-100">Create account</h2>
                  <p className="text-muted text-sm mb-7">Start tracking your gains today</p>

                  <form onSubmit={onRegister} className="space-y-4">
                    {[
                      { name: 'name',     label: 'Full Name', type: 'text',     placeholder: 'Alex Johnson' },
                      { name: 'email',    label: 'Email',     type: 'email',    placeholder: 'you@example.com' },
                      { name: 'password', label: 'Password',  type: 'password', placeholder: 'Min 8 characters' },
                    ].map(f => (
                      <div key={f.name}>
                        <label className="label">{f.label}</label>
                        <input className="input" type={f.type} placeholder={f.placeholder}
                          {...regForm.register(f.name)} />
                        {regForm.formState.errors[f.name] && (
                          <p className="text-xs text-pink mt-1">{regForm.formState.errors[f.name].message}</p>
                        )}
                      </div>
                    ))}
                    <button type="submit" className="btn-neon w-full mt-2"
                      disabled={regForm.formState.isSubmitting}>
                      {regForm.formState.isSubmitting ? 'Creating account…' : 'Create Account'}
                    </button>
                  </form>

                  <div className="mt-6 pt-6 border-t border-white/8 text-center">
                    <p className="text-sm text-muted">Already have an account?{' '}
                      <button onClick={() => setView(VIEWS.LOGIN)} className="text-neon font-semibold hover:underline">
                        Log in
                      </button>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── FORGOT PASSWORD ───────────────────────────── */}
            {view === VIEWS.FORGOT && (
              <motion.div key="forgot" {...slide}>
                <div className="card p-8">
                  <button onClick={() => setView(VIEWS.LOGIN)} className="text-muted text-xs mb-6 flex items-center gap-1 hover:text-slate-200 transition-colors">
                    ← Back to login
                  </button>
                  <h2 className="font-display text-3xl tracking-wide mb-1">Reset Password</h2>
                  <p className="text-muted text-sm mb-7">We'll send a 6-digit code to your email</p>

                  <form onSubmit={onForgot} className="space-y-4">
                    <div>
                      <label className="label">Email</label>
                      <input className="input" type="email" placeholder="you@example.com"
                        {...forgotForm.register('email')} />
                    </div>
                    <button type="submit" className="btn-electric w-full"
                      disabled={forgotForm.formState.isSubmitting}>
                      {forgotForm.formState.isSubmitting ? 'Sending code…' : 'Send Reset Code'}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* ─── OTP ENTRY ─────────────────────────────────── */}
            {view === VIEWS.OTP && (
              <motion.div key="otp" {...slide}>
                <div className="card p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                    style={{ background: 'rgba(173,255,47,0.12)', border: '1px solid rgba(173,255,47,0.3)' }}>
                    <span className="text-3xl">📨</span>
                  </div>
                  <h2 className="font-display text-3xl tracking-wide mb-1">Check Your Email</h2>
                  <p className="text-muted text-sm mb-7">Enter the 6-digit code sent to <strong className="text-slate-200">{resetEmail}</strong></p>

                  <div className="flex justify-center gap-2 mb-8">
                    {otpValue.map((digit, i) => (
                      <input
                        key={i} id={`otp-${i}`}
                        className="otp-input" type="text" inputMode="numeric"
                        maxLength={1} value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                      />
                    ))}
                  </div>

                  <button className="btn-neon w-full" onClick={confirmOtp}>Continue</button>
                  <button onClick={() => { onForgot(); }}
                    className="text-xs text-electric hover:underline mt-4 block mx-auto">
                    Resend code
                  </button>
                </div>
              </motion.div>
            )}

            {/* ─── NEW PASSWORD ──────────────────────────────── */}
            {view === VIEWS.RESET && (
              <motion.div key="reset" {...slide}>
                <div className="card p-8">
                  <h2 className="font-display text-3xl tracking-wide mb-1">New Password</h2>
                  <p className="text-muted text-sm mb-7">Choose a strong password</p>

                  <form onSubmit={onReset} className="space-y-4">
                    <div>
                      <label className="label">New Password</label>
                      <input className="input" type="password" placeholder="Min 8 characters"
                        {...resetForm.register('newPassword')} />
                      {resetForm.formState.errors.newPassword && (
                        <p className="text-xs text-pink mt-1">{resetForm.formState.errors.newPassword.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="label">Confirm Password</label>
                      <input className="input" type="password" placeholder="Repeat password"
                        {...resetForm.register('confirmPassword')} />
                      {resetForm.formState.errors.confirmPassword && (
                        <p className="text-xs text-pink mt-1">{resetForm.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>
                    <button type="submit" className="btn-neon w-full"
                      disabled={resetForm.formState.isSubmitting}>
                      {resetForm.formState.isSubmitting ? 'Resetting…' : 'Reset Password'}
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
