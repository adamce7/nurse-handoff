import { useState } from 'react';
import {
  ArrowLeft, AlertTriangle, Eye, CheckCircle2,
  Pill, ClipboardList, Mic, Send, Clock, ChevronRight, Loader2
} from 'lucide-react';
import { addNote } from '../api/client';

const priorityConfig = {
  critical: {
    label: 'Critical',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20',
    dot: 'bg-red-500 dark:bg-red-400',
  },
  watch: {
    label: 'Watch',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
  stable: {
    label: 'Stable',
    color: 'text-teal-700 dark:text-teal-400',
    bg: 'bg-teal-50 border-teal-200 dark:bg-teal-500/10 dark:border-teal-500/20',
    dot: 'bg-teal-500 dark:bg-teal-400',
  },
};

const medStatusConfig = {
  given: {
    label: 'Given',
    color: 'text-teal-700 dark:text-teal-400',
    bg: 'bg-teal-50 border-teal-200 dark:bg-teal-500/10 dark:border-teal-500/20',
  },
  pending: {
    label: 'Pending',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20',
  },
  running: {
    label: 'Running',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20',
  },
  available: {
    label: 'PRN',
    color: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-100 border-slate-200 dark:bg-white/5 dark:border-white/10',
  },
};

function VitalCard({ label, value, unit, warning }) {
  return (
    <div className={`border rounded-xl p-4 ${warning
      ? 'bg-red-50 border-red-200 dark:bg-red-500/5 dark:border-red-500/30'
      : 'bg-slate-50 border-slate-200 dark:bg-navy-900 dark:border-white/5'
    }`}>
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <div className="flex items-end gap-1 mt-1">
        <p className={`text-2xl font-display font-bold ${warning ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>{value}</p>
        <p className="text-xs text-slate-400 mb-1">{unit}</p>
      </div>
    </div>
  );
}

export default function PatientDetail({ patientId, patients, setActiveView, onNoteAdded }) {
  const patient = patients.find(p => p.id === patientId);
  const [note, setNote]         = useState('');
  const [notes, setNotes]       = useState(patient?.notes || []);
  const [submitting, setSubmitting] = useState(false);
  const [noteError, setNoteError]   = useState(null);

  if (!patient) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-medium">Select Patient</p>
          <h1 className="font-display font-bold text-3xl text-slate-900 dark:text-white mt-1">Patient Notes</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Select a patient to view their chart and add notes</p>
        </div>
        <div className="space-y-3">
          {patients.map((p) => {
            const cfg = priorityConfig[p.priority];
            return (
              <div
                key={p.id}
                onClick={() => setActiveView(`patient-${p.id}`)}
                className="group bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/5 hover:border-teal-300 dark:hover:border-teal-500/30 rounded-2xl p-5 cursor-pointer transition-all duration-200 flex items-center justify-between shadow-sm dark:shadow-none hover:shadow-md"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-navy-900 border border-slate-200 dark:border-white/5 flex items-center justify-center">
                    <p className="text-sm font-display font-bold text-slate-800 dark:text-white">{p.bed}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">{p.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{p.diagnosis}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:text-teal-500 dark:group-hover:text-teal-400 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const cfg = priorityConfig[patient.priority];

  const handleAddNote = async () => {
    if (!note.trim() || submitting) return;
    setSubmitting(true);
    setNoteError(null);
    try {
      const result = await addNote(patient.id, note.trim());
      const newNote = { time: result.time, text: note.trim() };
      setNotes(prev => [...prev, newNote]);
      onNoteAdded?.(patient.id, newNote);
      setNote('');
    } catch (err) {
      setNoteError('Failed to save note. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Back */}
      <button
        onClick={() => setActiveView('patients')}
        className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors mb-6"
      >
        <ArrowLeft size={15} />
        All Patients
      </button>

      {/* Patient Header */}
      <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/5 rounded-2xl p-6 mb-6 shadow-sm dark:shadow-none">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-navy-900 border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center flex-shrink-0">
              <p className="text-xs text-slate-400 dark:text-slate-500 leading-none">Bed</p>
              <p className="text-xl font-display font-bold text-slate-900 dark:text-white">{patient.bed}</p>
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-white">{patient.name}</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">{patient.age} years old &nbsp;·&nbsp; {patient.diagnosis}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-500 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full border border-slate-200 dark:border-white/5">
                  Admitted: {patient.admissionDate}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {patient.alerts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 space-y-2">
            {patient.alerts.map((alert, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/8 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-2.5">
                <AlertTriangle size={14} className="flex-shrink-0" />
                {alert}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="col-span-2 space-y-6">

          {/* Vitals */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-slate-800 dark:text-white">Latest Vitals</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Clock size={11} />
                Updated {patient.vitals.lastUpdated}
              </p>
            </div>
            <div className="grid grid-cols-5 gap-3">
              <VitalCard label="HR"   value={patient.vitals.hr}   unit="bpm" warning={patient.vitals.hr > 100} />
              <VitalCard label="BP"   value={patient.vitals.bp}   unit="mmHg" />
              <VitalCard label="Temp" value={patient.vitals.temp} unit="°C"  warning={patient.vitals.temp > 38} />
              <VitalCard label="RR"   value={patient.vitals.rr}   unit="/min" warning={patient.vitals.rr > 20} />
              <VitalCard label="SpO₂" value={patient.vitals.spo2} unit="%"   warning={patient.vitals.spo2 < 93} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <h2 className="font-display font-semibold text-slate-800 dark:text-white mb-3">Shift Notes</h2>
            <div className="space-y-2 mb-4">
              {notes.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">No notes recorded yet this shift.</p>
              )}
              {notes.map((n, i) => (
                <div key={i} className="flex gap-3 bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/5 rounded-xl p-4 animate-slide-up shadow-sm dark:shadow-none">
                  <div className="flex-shrink-0">
                    <span className="text-xs font-mono font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-2 py-1 rounded-lg border border-teal-200 dark:border-teal-500/20">
                      {n.time}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{n.text}</p>
                </div>
              ))}
            </div>

            {/* Note Input */}
            <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/5 focus-within:border-teal-400 dark:focus-within:border-teal-500/40 rounded-2xl p-4 transition-colors shadow-sm dark:shadow-none">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add a shift note… (e.g. 'Patient reported nausea at 15:00, anti-emetic administered')"
                className="w-full bg-transparent text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 resize-none h-24 leading-relaxed"
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAddNote(); }}
              />
              {noteError && (
                <p className="text-xs text-red-500 mt-1">{noteError}</p>
              )}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-500/10">
                    <Mic size={13} />
                    Voice Input
                  </button>
                </div>
                <button
                  onClick={handleAddNote}
                  disabled={!note.trim() || submitting}
                  className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-100 dark:disabled:bg-navy-900 disabled:text-slate-400 dark:disabled:text-slate-600 text-white disabled:cursor-not-allowed text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-200"
                >
                  {submitting
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Send size={12} />
                  }
                  {submitting ? 'Saving…' : 'Add Note'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">

          {/* Medications */}
          <div>
            <h2 className="font-display font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
              <Pill size={16} className="text-slate-400" />
              Medications
            </h2>
            <div className="space-y-2">
              {patient.medications.map((med, i) => {
                const mCfg = medStatusConfig[med.status];
                return (
                  <div key={i} className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/5 rounded-xl p-3 shadow-sm dark:shadow-none">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{med.name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{med.route} &nbsp;·&nbsp; Due: {med.due}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${mCfg.bg} ${mCfg.color}`}>
                        {mCfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pending Orders */}
          <div>
            <h2 className="font-display font-semibold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
              <ClipboardList size={16} className="text-slate-400" />
              Pending Orders
            </h2>
            <div className="space-y-2">
              {patient.pendingOrders.map((order, i) => (
                <div key={i} className="flex items-start gap-2.5 bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/5 rounded-xl p-3 shadow-sm dark:shadow-none">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 flex-shrink-0 mt-1.5" />
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{order}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
