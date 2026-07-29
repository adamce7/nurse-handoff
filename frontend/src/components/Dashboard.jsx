import { AlertTriangle, Eye, CheckCircle2, Clock, ChevronRight, Bell } from 'lucide-react';

const priorityConfig = {
  critical: {
    label: 'Critical',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20',
    dot: 'bg-red-500 dark:bg-red-400',
    icon: AlertTriangle,
  },
  watch: {
    label: 'Watch',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20',
    dot: 'bg-amber-500 dark:bg-amber-400',
    icon: Eye,
  },
  stable: {
    label: 'Stable',
    color: 'text-teal-700 dark:text-teal-400',
    bg: 'bg-teal-50 border-teal-200 dark:bg-teal-500/10 dark:border-teal-500/20',
    dot: 'bg-teal-500 dark:bg-teal-400',
    icon: CheckCircle2,
  },
};

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/8 rounded-2xl p-6 shadow-sm dark:shadow-none">
      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-medium">{label}</p>
      <p className={`text-4xl font-display font-bold mt-3 ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">{sub}</p>}
    </div>
  );
}

export default function Dashboard({ patients, setActiveView }) {
  const critical    = patients.filter(p => p.priority === 'critical');
  const watch       = patients.filter(p => p.priority === 'watch');
  const stable      = patients.filter(p => p.priority === 'stable');
  const totalAlerts = patients.reduce((acc, p) => acc + p.alerts.length, 0);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-medium">Wednesday, 11 March 2025</p>
        <h1 className="font-display font-bold text-3xl text-slate-900 dark:text-white mt-1">Shift Overview</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Ward 4 — Day Shift &nbsp;·&nbsp; 07:00–19:00</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <StatCard label="Total Patients" value={patients.length} sub="under your care" accent="text-slate-900 dark:text-white" />
        <StatCard label="Critical" value={critical.length} sub="require urgent attention" accent="text-red-600 dark:text-red-400" />
        <StatCard label="Watch" value={watch.length} sub="close monitoring needed" accent="text-amber-600 dark:text-amber-400" />
        <StatCard label="Active Alerts" value={totalAlerts} sub="across all patients" accent="text-amber-600 dark:text-amber-300" />
      </div>

      {/* Alerts Banner */}
      {totalAlerts > 0 && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-500/12 border border-amber-200 dark:border-amber-400/35 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-amber-200 dark:border-amber-400/20 bg-amber-100/60 dark:bg-amber-500/10">
            <Bell size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Active Alerts This Shift</p>
            <span className="ml-auto bg-amber-200 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-400/30">
              {totalAlerts}
            </span>
          </div>
          <ul className="px-5 py-3 space-y-2">
            {patients.flatMap(p =>
              p.alerts.map((alert, i) => (
                <li key={`${p.id}-${i}`} className="flex items-start gap-2 text-xs text-amber-700/80 dark:text-amber-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 flex-shrink-0 mt-1" />
                  <span><span className="font-semibold text-amber-800 dark:text-amber-300">{p.name} ({p.bed})</span> — {alert}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {/* Patient Grid */}
      <div>
        <h2 className="font-display font-semibold text-slate-800 dark:text-white text-lg mb-4">Patient List</h2>
        <div className="space-y-3">
          {[...critical, ...watch, ...stable].map((patient, idx) => {
            const cfg = priorityConfig[patient.priority];
            const Icon = cfg.icon;
            const pendingMeds = patient.medications.filter(m => m.status === 'pending').length;

            return (
              <div
                key={patient.id}
                onClick={() => setActiveView(`patient-${patient.id}`)}
                className="group bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/8 hover:border-slate-300 dark:hover:border-white/15 rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md dark:hover:bg-navy-700/60 shadow-sm dark:shadow-none animate-slide-up"
                style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'both' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Bed Badge */}
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-navy-900 border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center flex-shrink-0">
                      <p className="text-xs text-slate-400 dark:text-slate-500 leading-none">Bed</p>
                      <p className="text-base font-display font-bold text-slate-800 dark:text-white leading-tight">{patient.bed}</p>
                    </div>
                    {/* Info */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 dark:text-white">{patient.name}</p>
                        <span className="text-slate-300 dark:text-slate-500 text-sm">·</span>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{patient.age}y</p>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{patient.diagnosis}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                        {pendingMeds > 0 && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full border border-slate-200 dark:border-white/5">
                            {pendingMeds} med{pendingMeds > 1 ? 's' : ''} pending
                          </span>
                        )}
                        {patient.alerts.length > 0 && (
                          <span className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-500/20">
                            {patient.alerts.length} alert{patient.alerts.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Vitals + Arrow */}
                  <div className="flex items-center gap-6">
                    <div className="hidden md:grid grid-cols-3 gap-x-5 gap-y-1 text-right">
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">HR</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{patient.vitals.hr} <span className="text-xs font-normal text-slate-400 dark:text-slate-500">bpm</span></p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">SpO₂</p>
                        <p className={`text-sm font-semibold ${patient.vitals.spo2 < 93 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                          {patient.vitals.spo2}<span className="text-xs font-normal text-slate-400 dark:text-slate-500">%</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Temp</p>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{patient.vitals.temp}<span className="text-xs font-normal text-slate-400 dark:text-slate-500">°C</span></p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-teal-500 dark:group-hover:text-teal-400 transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
