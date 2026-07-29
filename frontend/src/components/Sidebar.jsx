import {
  LayoutDashboard,
  ClipboardList,
  FileCheck2,
  LogOut,
  Activity,
  Sun,
  Moon,
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'patients', label: 'Patient Notes', icon: ClipboardList },
  { id: 'handoff', label: 'Handoff Summary', icon: FileCheck2 },
];

export default function Sidebar({ activeView, setActiveView, alertCount, isDark, toggleTheme }) {
  return (
    <aside className="w-72 min-h-screen bg-white dark:bg-navy-900 border-r border-slate-200 dark:border-white/8 flex flex-col fixed left-0 top-0 bottom-0 z-10">
      {/* Logo */}
      <div className="px-7 py-7 border-b border-slate-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500 flex items-center justify-center flex-shrink-0">
            <Activity size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-display font-bold text-slate-900 dark:text-white text-xl leading-none">NurseSync</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Handoff Assistant</p>
          </div>
        </div>
      </div>

      {/* Shift Info */}
      <div className="mx-4 mt-5 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-white/8 p-5">
        <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-medium mb-3">Active Shift</p>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse-soft" />
          <p className="text-sm font-semibold text-slate-800 dark:text-white">Day Shift</p>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">07:00 – 19:00</p>
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/5">
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">Assigned Nurse</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-1">Sarah Mitchell, RN</p>
          <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Ward 4 — General Medicine</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 mt-7">
        <p className="text-xs text-slate-400 dark:text-slate-600 uppercase tracking-widest font-medium px-3 mb-3">Navigation</p>
        <ul className="space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeView === id || (activeView.startsWith('patient-') && id === 'patients');
            return (
              <li key={id}>
                <button
                  onClick={() => setActiveView(id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                    ${isActive
                      ? 'bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-500/15 dark:text-teal-400 dark:border-teal-500/20'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/5'
                    }`}
                >
                  <Icon
                    size={18}
                    className={isActive
                      ? 'text-teal-600 dark:text-teal-400'
                      : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                    }
                  />
                  {label}
                  {id === 'dashboard' && alertCount > 0 && (
                    <span className="ml-auto bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/20 text-xs font-semibold px-2 py-0.5 rounded-full">
                      {alertCount}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="p-5 border-t border-slate-100 dark:border-white/5 space-y-1">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/5 transition-all duration-200"
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-white/5 transition-all duration-200">
          <LogOut size={17} />
          End Shift
        </button>
      </div>
    </aside>
  );
}
