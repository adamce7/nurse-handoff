import { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, FileCheck2, Download, XCircle } from 'lucide-react';
import { generateSummaries, confirmHandoff } from '../api/client';

const priorityConfig = {
  critical: {
    label: 'Critical',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/30',
    dot: 'bg-red-500 dark:bg-red-400',
    order: 0,
  },
  watch: {
    label: 'Watch',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30',
    dot: 'bg-amber-500 dark:bg-amber-400',
    order: 1,
  },
  stable: {
    label: 'Stable',
    color: 'text-teal-700 dark:text-teal-400',
    bg: 'bg-teal-50 border-teal-200 dark:bg-teal-500/10 dark:border-teal-500/20',
    dot: 'bg-teal-500 dark:bg-teal-400',
    order: 2,
  },
};

const sbarLabels = {
  situation: {
    label: 'S', full: 'Situation',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20',
  },
  background: {
    label: 'B', full: 'Background',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 border-purple-200 dark:bg-purple-500/10 dark:border-purple-500/20',
  },
  assessment: {
    label: 'A', full: 'Assessment',
    color: 'text-teal-700 dark:text-teal-400',
    bg: 'bg-teal-50 border-teal-200 dark:bg-teal-500/10 dark:border-teal-500/20',
  },
  recommendation: {
    label: 'R', full: 'Recommendation',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20',
  },
};

function SBARCard({ summary, patient }) {
  const [expanded, setExpanded] = useState(true);
  const cfg = priorityConfig[summary.priority];
  const isCritical = summary.priority === 'critical';

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all duration-300 shadow-sm dark:shadow-none ${isCritical ? 'border-red-200 dark:border-red-500/30' : 'border-slate-200 dark:border-white/5'}`}>
      {/* Card Header */}
      <div
        className={`flex items-center justify-between p-5 cursor-pointer ${isCritical ? 'bg-red-50 dark:bg-red-500/8' : 'bg-white dark:bg-navy-800'}`}
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-navy-900 border border-slate-200 dark:border-white/5 flex items-center justify-center flex-shrink-0">
            <p className="font-display font-bold text-slate-800 dark:text-white text-sm">{patient?.bed}</p>
          </div>
          <div>
            <p className="font-semibold text-slate-800 dark:text-white">{patient?.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{patient?.diagnosis}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${cfg.bg} ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          {expanded
            ? <ChevronUp size={16} className="text-slate-400 dark:text-slate-500" />
            : <ChevronDown size={16} className="text-slate-400 dark:text-slate-500" />
          }
        </div>
      </div>

      {/* SBAR Content */}
      {expanded && (
        <div className="bg-slate-50 dark:bg-navy-900/50 border-t border-slate-200 dark:border-white/5 p-5 space-y-3 animate-slide-up">
          <div className="grid grid-cols-2 gap-3">
            {['situation', 'background', 'assessment', 'recommendation'].map(key => {
              const s = sbarLabels[key];
              return (
                <div key={key} className={`border rounded-xl p-4 ${s.bg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-display font-bold border ${s.bg} ${s.color}`}>
                      {s.label}
                    </span>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${s.color}`}>{s.full}</p>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{summary[key]}</p>
                </div>
              );
            })}
          </div>
          {/* Flags */}
          {summary.flags && summary.flags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {summary.flags.map((flag, i) => (
                <span key={i} className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2.5 py-1 rounded-full">
                  {flag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function HandoffSummary({ patients }) {
  const [status, setStatus]         = useState('idle');   // idle | generating | done | confirmed | error
  const [summaries, setSummaries]   = useState([]);
  const [failed, setFailed]         = useState([]);
  const [genError, setGenError]     = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState(null);

  const handleGenerate = async () => {
    setStatus('generating');
    setGenError(null);
    try {
      const { summaries: s, failedPatientIds } = await generateSummaries();
      setSummaries(s);
      setFailed(failedPatientIds);
      setStatus('done');
    } catch (err) {
      setGenError(err.message);
      setStatus('error');
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setConfirmError(null);
    try {
      await confirmHandoff(summaries);
      setStatus('confirmed');
    } catch (err) {
      setConfirmError(err.message);
    } finally {
      setConfirming(false);
    }
  };

  const sortedSummaries = [...summaries].sort(
    (a, b) => (priorityConfig[a.priority]?.order ?? 2) - (priorityConfig[b.priority]?.order ?? 2)
  );

  const criticalPatients = patients.filter(p => p.priority === 'critical');

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-medium">End of Shift</p>
          <h1 className="font-display font-bold text-3xl text-slate-900 dark:text-white mt-1">Handoff Summaries</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">AI-generated SBAR summaries for all {patients.length} patients</p>
        </div>
        {status === 'done' && (
          <button className="flex items-center gap-2 bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all duration-200 shadow-sm dark:shadow-none">
            <Download size={15} />
            Export Handoff PDF
          </button>
        )}
      </div>

      {/* Idle State */}
      {status === 'idle' && (
        <div className="flex flex-col items-center justify-center py-24 text-center animate-slide-up">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 flex items-center justify-center mb-6">
            <Sparkles size={28} className="text-teal-600 dark:text-teal-400" />
          </div>
          <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white">Ready to Generate</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md text-sm leading-relaxed">
            The AI will analyse all patient chart data and shift notes, then generate a structured SBAR handoff summary for each patient — ranked by clinical priority.
          </p>
          <div className="flex items-center gap-4 mt-4 mb-8">
            <div className="text-center">
              <p className="text-2xl font-display font-bold text-slate-900 dark:text-white">{patients.length}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Patients</p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
            <div className="text-center">
              <p className="text-2xl font-display font-bold text-red-600 dark:text-red-400">
                {patients.filter(p => p.priority === 'critical').length}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Critical</p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
            <div className="text-center">
              <p className="text-2xl font-display font-bold text-amber-600 dark:text-amber-400">
                {patients.filter(p => p.priority === 'watch').length}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Watch</p>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2.5 bg-teal-500 hover:bg-teal-400 text-white font-semibold text-sm px-8 py-3.5 rounded-2xl transition-all duration-200 shadow-lg shadow-teal-500/20"
          >
            <Sparkles size={16} />
            Generate Handoff Summaries
          </button>
        </div>
      )}

      {/* Loading State */}
      {status === 'generating' && (
        <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
          <div className="relative w-16 h-16 mb-6">
            <div className="w-16 h-16 rounded-full border-2 border-teal-200 dark:border-teal-500/20 absolute" />
            <div className="w-16 h-16 rounded-full border-2 border-t-teal-500 dark:border-t-teal-400 absolute animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={18} className="text-teal-600 dark:text-teal-400" />
            </div>
          </div>
          <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">Generating Summaries</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Calling GPT-4o for each patient concurrently…</p>
          <div className="mt-8 space-y-2 w-72">
            {['Reading chart data', 'Processing shift notes', 'Applying SBAR format', 'Ranking by priority'].map((step, i) => (
              <div
                key={step}
                className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 animate-slide-up"
                style={{ animationDelay: `${i * 350}ms`, animationFillMode: 'both' }}
              >
                <Loader2 size={13} className="animate-spin text-teal-500 dark:text-teal-400 flex-shrink-0" />
                {step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center justify-center mb-6">
            <XCircle size={28} className="text-red-500 dark:text-red-400" />
          </div>
          <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">Generation Failed</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm max-w-sm">{genError}</p>
          <button
            onClick={() => setStatus('idle')}
            className="mt-6 text-sm text-teal-600 dark:text-teal-400 hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Generated Summaries */}
      {(status === 'done' || status === 'confirmed') && (
        <div className="animate-fade-in">

          {/* Confirmed Banner */}
          {status === 'confirmed' && (
            <div className="flex items-center gap-3 bg-teal-50 dark:bg-teal-500/8 border border-teal-200 dark:border-teal-500/20 rounded-2xl p-4 mb-6">
              <FileCheck2 size={18} className="text-teal-600 dark:text-teal-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">Handoff Confirmed</p>
                <p className="text-xs text-teal-600/70 dark:text-teal-400/70 mt-0.5">
                  Shift handoff locked. The incoming nurse can now access these summaries.
                </p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {status === 'done' && (
            <div className="flex items-center gap-3 bg-teal-50 dark:bg-teal-500/8 border border-teal-200 dark:border-teal-500/20 rounded-2xl p-4 mb-6">
              <CheckCircle2 size={18} className="text-teal-600 dark:text-teal-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">Summaries Generated</p>
                <p className="text-xs text-teal-600/70 dark:text-teal-400/70 mt-0.5">
                  {summaries.length} SBAR {summaries.length === 1 ? 'summary' : 'summaries'} ready — review each one before confirming handoff.
                  {failed.length > 0 && ` (${failed.length} patient${failed.length > 1 ? 's' : ''} failed — see below)`}
                </p>
              </div>
            </div>
          )}

          {/* Critical Alert */}
          {criticalPatients.length > 0 && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-500/8 border border-red-200 dark:border-red-500/20 rounded-2xl p-4 mb-6">
              <AlertTriangle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">
                <span className="font-semibold">Urgent:</span>{' '}
                {criticalPatients.map(p => p.name).join(', ')} flagged as critical. Ensure incoming nurse acknowledges immediately.
              </p>
            </div>
          )}

          {/* Failed patients */}
          {failed.length > 0 && (
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-500/8 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 mb-6">
              <XCircle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <span className="font-semibold">Generation failed for:</span>{' '}
                {failed.map(id => patients.find(p => p.id === id)?.name || id).join(', ')}.
                These patients were excluded — add their summaries manually.
              </p>
            </div>
          )}

          {/* SBAR Cards */}
          <div className="space-y-4 mb-8">
            {sortedSummaries.map(summary => {
              const patient = patients.find(p => p.id === summary.patientId);
              return <SBARCard key={summary.patientId} summary={summary} patient={patient} />;
            })}
          </div>

          {/* Confirm Handoff */}
          {status === 'done' && (
            <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/5 rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4 shadow-sm dark:shadow-none">
              <div>
                <p className="font-semibold text-slate-800 dark:text-white">Ready to hand over?</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Confirm all summaries are accurate before the incoming nurse begins their shift.
                </p>
                {confirmError && (
                  <p className="text-xs text-red-500 mt-1">{confirmError}</p>
                )}
              </div>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="flex items-center gap-2.5 bg-teal-500 hover:bg-teal-400 disabled:bg-teal-300 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-teal-500/20 disabled:cursor-not-allowed"
              >
                {confirming
                  ? <Loader2 size={16} className="animate-spin" />
                  : <FileCheck2 size={16} />
                }
                {confirming ? 'Confirming…' : 'Confirm & Complete Handoff'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
