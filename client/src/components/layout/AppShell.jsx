import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to:'/dashboard', label:'Dashboard', icon: GridIcon    },
  { to:'/logger',    label:'Tracker',   icon: DumbbellIcon },
  { to:'/ai',        label:'AI Coach',  icon: BrainIcon   },
  { to:'/profile',   label:'Profile',   icon: PersonIcon  },
];

export default function AppShell() {
  const { user } = useAuth();
  const initials = user?.name?.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) || 'VF';

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Desktop nav */}
      <header className="hidden md:flex items-center justify-between px-6 py-3 border-b border-white/8 bg-bg/95 backdrop-blur sticky top-0 z-50">
        <span className="font-display text-3xl tracking-widest text-neon-grad">VIBEFIT</span>
        <nav className="flex items-center gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
               ${isActive ? 'bg-surface text-neon' : 'text-muted hover:text-slate-200 hover:bg-white/5'}`}>
              <Icon size={16}/> {label}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/profile">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-display text-sm text-bg"
            style={{background:'linear-gradient(135deg,#ff007f,#00f2ff)'}}>
            {initials}
          </div>
        </NavLink>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 md:pb-8">
        <motion.div key={location.pathname} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}
          transition={{duration:0.22}} className="max-w-3xl mx-auto px-4 py-5">
          <Outlet />
        </motion.div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur border-t border-white/8 flex z-50 safe-area-pb">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-all
             ${isActive ? 'text-neon' : 'text-muted'}`}>
            <Icon size={20}/> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function GridIcon({ size=16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>;
}
function DumbbellIcon({ size=16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M6 5v14M18 5v14M6 8h2m8 0h2M6 16h2m8 0h2M8 5h8M8 19h8"/>
  </svg>;
}
function BrainIcon({ size=16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.16z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.16z"/>
  </svg>;
}
function PersonIcon({ size=16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>;
}
