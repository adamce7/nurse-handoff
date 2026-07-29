import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PatientDetail from './components/PatientDetail';
import HandoffSummary from './components/HandoffSummary';
import { loadShift, SHIFT_ID } from './api/client';

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [isDark, setIsDark]         = useState(false);
  const [patients, setPatients]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [apiError, setApiError]     = useState(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  useEffect(() => {
    loadShift()
      .then(data  => setPatients(data.patients))
      .catch(err  => setApiError(err.message))
      .finally(() => setLoading(false));
  }, []);

  /** Called by PatientDetail after a note is persisted — keeps patients state fresh */
  const handleNoteAdded = (patientId, note) => {
    setPatients(prev =>
      prev.map(p =>
        p.id === patientId ? { ...p, notes: [...p.notes, note] } : p
      )
    );
  };

  const alertCount = patients.reduce((acc, p) => acc + p.alerts.length, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-navy-950 flex items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400 text-sm animate-pulse">
          Connecting to NurseSync API…
        </p>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-navy-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-semibold">Could not connect to the API</p>
          <p className="text-slate-400 text-sm mt-1">{apiError}</p>
          <p className="text-slate-400 text-xs mt-3">Make sure the backend is running on port 8000.</p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    if (activeView === 'dashboard') {
      return <Dashboard patients={patients} setActiveView={setActiveView} />;
    }
    if (activeView === 'patients') {
      return (
        <PatientDetail
          patientId={null}
          patients={patients}
          setActiveView={setActiveView}
          onNoteAdded={handleNoteAdded}
        />
      );
    }
    if (activeView.startsWith('patient-')) {
      const patientId = activeView.replace('patient-', '');
      return (
        <PatientDetail
          patientId={patientId}
          patients={patients}
          setActiveView={setActiveView}
          onNoteAdded={handleNoteAdded}
        />
      );
    }
    if (activeView === 'handoff') {
      return <HandoffSummary patients={patients} shiftId={SHIFT_ID} />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950 flex">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        alertCount={alertCount}
        isDark={isDark}
        toggleTheme={() => setIsDark(d => !d)}
      />

      <main className="flex-1 ml-72 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {renderView()}
        </div>
      </main>
    </div>
  );
}
