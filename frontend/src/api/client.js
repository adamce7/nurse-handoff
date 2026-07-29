/**
 * client.js
 * ---------
 * All communication with the NurseSync backend API.
 * Normalises snake_case backend responses into camelCase for the frontend.
 */

const BASE_URL = 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Shift constants — match the Postman collection defaults
// ---------------------------------------------------------------------------
export const SHIFT_ID   = 'shift_20250311_day';
export const NURSE_ID   = 'nurse_sarah_mitchell';
export const PATIENT_IDS = ['pt_001', 'pt_002', 'pt_003'];

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

/** Derive clinical priority from raw vitals + alerts (mirrors backend prompt rules) */
function derivePriority(p) {
  const systolic = parseInt(p.vitals.bp.split('/')[0], 10);
  const isCritical =
    p.vitals.spo2 < 92  || p.vitals.hr > 110 || p.vitals.hr < 50 ||
    p.vitals.temp > 38.5 || p.vitals.rr > 22  || systolic < 90    ||
    (p.alerts && p.alerts.length > 0);
  if (isCritical) return 'critical';

  const isWatch =
    p.vitals.spo2 < 95 || p.vitals.hr > 100 ||
    p.vitals.temp > 37.5 || p.vitals.rr > 20;
  return isWatch ? 'watch' : 'stable';
}

/** Convert a backend Patient object (snake_case) into the frontend shape (camelCase) */
export function normalizePatient(p) {
  return {
    id:            p.patient_id,
    name:          p.name,
    age:           p.age,
    bed:           p.bed,
    diagnosis:     p.diagnosis,
    admissionDate: p.admission_date,
    priority:      derivePriority(p),
    alerts:        p.alerts || [],
    vitals: {
      hr:          p.vitals.hr,
      bp:          p.vitals.bp,
      temp:        p.vitals.temp,
      rr:          p.vitals.rr,
      spo2:        p.vitals.spo2,
      lastUpdated: p.vitals.last_updated,
    },
    medications:   p.medications.map(m => ({
      name:   m.name,
      route:  m.route,
      due:    m.due,
      status: m.status,
    })),
    pendingOrders: p.pending_orders || [],
    notes:         (p.nurse_notes || []).map(n => ({ time: n.time, text: n.text })),
  };
}

/** Convert a successful PatientSummaryResult into the frontend summary shape */
export function normalizeSummary(result) {
  if (!result.success || !result.summary) return null;
  const s = result.summary;
  return {
    patientId:      s.patient_id,
    priority:       s.priority,
    situation:      s.situation,
    background:     s.background,
    assessment:     s.assessment,
    recommendation: s.recommendation,
    flags:          s.flags || [],
    generated_at:   s.generated_at,
  };
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

/** Register the shift and return normalised patient list */
export async function loadShift() {
  const res = await fetch(`${BASE_URL}/shift/load`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      shift_id:    SHIFT_ID,
      nurse_id:    NURSE_ID,
      patient_ids: PATIENT_IDS,
    }),
  });
  if (!res.ok) throw new Error(`Shift load failed (${res.status})`);
  const data = await res.json();
  return { ...data, patients: data.patients.map(normalizePatient) };
}

/** Persist a nurse note to the backend and return the saved note */
export async function addNote(patientId, noteText) {
  const res = await fetch(`${BASE_URL}/notes/add`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      shift_id:   SHIFT_ID,
      patient_id: patientId,
      note_text:  noteText,
    }),
  });
  if (!res.ok) throw new Error(`Add note failed (${res.status})`);
  return res.json(); // { patient_id, time, message }
}

/**
 * Trigger GPT-4o SBAR generation for the registered shift.
 * Backend auto-loads patients + persisted notes from the shift record.
 * Returns { summaries, failedPatientIds }.
 */
export async function generateSummaries() {
  const res = await fetch(`${BASE_URL}/summary/generate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ shift_id: SHIFT_ID, nurse_id: NURSE_ID }),
  });
  if (!res.ok) throw new Error(`Generate failed (${res.status})`);
  const data = await res.json();

  const summaries      = [];
  const failedPatientIds = [];

  for (const result of data.results) {
    const s = normalizeSummary(result);
    if (s) {
      summaries.push(s);
    } else {
      failedPatientIds.push(result.patient_id);
    }
  }

  return { summaries, failedPatientIds };
}

/**
 * Confirm the handoff — nurse has reviewed and approved the SBAR summaries.
 * Denormalises camelCase summaries back to the backend's snake_case shape.
 */
export async function confirmHandoff(summaries) {
  const backendSummaries = summaries.map(s => ({
    patient_id:     s.patientId,
    priority:       s.priority,
    situation:      s.situation,
    background:     s.background,
    assessment:     s.assessment,
    recommendation: s.recommendation,
    flags:          s.flags || [],
    generated_at:   s.generated_at || new Date().toISOString(),
  }));

  const res = await fetch(`${BASE_URL}/handoff/confirm`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      shift_id:  SHIFT_ID,
      nurse_id:  NURSE_ID,
      summaries: backendSummaries,
    }),
  });
  if (!res.ok) throw new Error(`Confirm handoff failed (${res.status})`);
  return res.json(); // { shift_id, confirmed_at, confirmed_by, status, summary_count }
}
