import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import AuthPage       from './pages/Auth/AuthPage';
import OnboardingPage from './pages/Onboarding/OnboardingPage';
import DashboardPage  from './pages/Dashboard/DashboardPage';
import LoggerPage     from './pages/Logger/LoggerPage';
import AIPage         from './pages/AI/AIPage';
import ProfilePage    from './pages/Profile/ProfilePage';
import AppShell       from './components/layout/AppShell';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user)   return <Navigate to="/auth" replace />;
  return children;
}

function RequireOnboarding({ children }) {
  const { user } = useAuth();
  if (!user?.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return children;
}

function Splash() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4">
      <h1 className="font-display text-5xl tracking-widest text-neon-grad">VIBEFIT</h1>
      <div className="flex gap-1.5">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-neon animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      <Route path="/onboarding" element={<RequireAuth><OnboardingPage /></RequireAuth>} />
      <Route path="/" element={
        <RequireAuth><RequireOnboarding><AppShell /></RequireOnboarding></RequireAuth>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="logger"    element={<LoggerPage />} />
        <Route path="ai"        element={<AIPage />} />
        <Route path="profile"   element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/auth'} replace />} />
    </Routes>
  );
}
