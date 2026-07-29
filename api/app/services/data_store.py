"""
data_store.py
-------------
JSON-backed data store that emulates a PostgreSQL database for the PoC.

IMPORTANT: This module is intentionally written to mirror the interface a real
database service would expose. When moving to PostgreSQL, replace the JSON
read/write internals with SQLAlchemy queries — the public function signatures
stay the same, so nothing else in the codebase needs to change.

Files used:
  api/data/patients.json      — read-only "EMR" source, pre-populated
  api/data/runtime_store.json — read/write runtime state (notes, summaries, confirmations)

Thread safety: For the PoC (single-process), file I/O is fine. For production,
replace with async DB calls (asyncpg / SQLAlchemy async).
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.core.config import settings
from app.models.schemas import (
    Patient,
    NurseNote,
    SBARSummary,
)


# ---------------------------------------------------------------------------
# Internal helpers — read/write JSON files
# ---------------------------------------------------------------------------

def _read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_json(path: Path, data: dict) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)


def _load_store() -> dict:
    store = _read_json(settings.store_file)
    store.setdefault("shifts", {})
    store.setdefault("audit_log", [])
    return store


def _save_store(store: dict) -> None:
    _write_json(settings.store_file, store)


def _append_audit(store: dict, action: str, detail: dict) -> None:
    store["audit_log"].append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": action,
        **detail,
    })


# ---------------------------------------------------------------------------
# Patient data (read-only EMR source)
# ---------------------------------------------------------------------------

def get_all_patients() -> list[Patient]:
    """Loads all patients from the static patients.json fixture."""
    raw = _read_json(settings.patients_file)
    return [Patient.model_validate(p) for p in raw.get("patients", [])]


def get_patient(patient_id: str) -> Optional[Patient]:
    """Returns a single patient by ID, or None if not found."""
    patients = get_all_patients()
    return next((p for p in patients if p.patient_id == patient_id), None)


# ---------------------------------------------------------------------------
# Shifts
# ---------------------------------------------------------------------------

def create_shift(shift_id: str, nurse_id: str, patient_ids: list[str]) -> dict:
    """
    Registers a new active shift in the store.
    In production this would INSERT a row into the shifts table.
    """
    store = _load_store()
    shift = {
        "shift_id": shift_id,
        "nurse_id": nurse_id,
        "status": "active",
        "patient_ids": patient_ids,
        "notes": {pid: [] for pid in patient_ids},
        "generated_summaries": None,
        "confirmed_at": None,
        "confirmed_by": None,
    }
    store["shifts"][shift_id] = shift
    _append_audit(store, "shift_created", {"shift_id": shift_id, "nurse_id": nurse_id})
    _save_store(store)
    return shift


def get_shift(shift_id: str) -> Optional[dict]:
    """Returns the raw shift dict, or None if not found."""
    store = _load_store()
    return store["shifts"].get(shift_id)


def get_shift_patients(shift_id: str) -> list[Patient]:
    """
    Returns Patient objects for a shift, merging EMR data with any notes
    recorded during the shift so far.
    """
    shift = get_shift(shift_id)
    if not shift:
        return []

    all_patients = {p.patient_id: p for p in get_all_patients()}
    results = []

    for pid in shift["patient_ids"]:
        patient = all_patients.get(pid)
        if patient:
            # Merge in any nurse notes recorded during the shift
            raw_notes = shift["notes"].get(pid, [])
            patient = patient.model_copy(
                update={"nurse_notes": [NurseNote(**n) for n in raw_notes]}
            )
            results.append(patient)

    return results


# ---------------------------------------------------------------------------
# Nurse Notes
# ---------------------------------------------------------------------------

def add_note(shift_id: str, patient_id: str, note_text: str) -> NurseNote:
    """
    Appends a timestamped note for a patient in the given shift.
    In production this would INSERT a row into the shift_notes table.
    """
    store = _load_store()
    shift = store["shifts"].get(shift_id)
    if not shift:
        raise ValueError(f"Shift '{shift_id}' not found.")
    if patient_id not in shift["patient_ids"]:
        raise ValueError(f"Patient '{patient_id}' is not assigned to shift '{shift_id}'.")

    note = NurseNote(
        time=datetime.now(timezone.utc).strftime("%H:%M"),
        text=note_text.strip(),
    )
    shift["notes"].setdefault(patient_id, []).append(note.model_dump())
    _append_audit(store, "note_added", {"shift_id": shift_id, "patient_id": patient_id})
    _save_store(store)
    return note


# ---------------------------------------------------------------------------
# Summaries
# ---------------------------------------------------------------------------

def save_summaries(shift_id: str, summaries: list[SBARSummary]) -> None:
    """
    Persists the AI-generated draft summaries to the store.
    In production this would INSERT rows into the handoff_summaries table.
    """
    store = _load_store()
    shift = store["shifts"].get(shift_id)
    if not shift:
        raise ValueError(f"Shift '{shift_id}' not found.")

    shift["generated_summaries"] = [s.model_dump() for s in summaries]
    _append_audit(store, "summaries_generated", {
        "shift_id": shift_id,
        "count": len(summaries),
    })
    _save_store(store)


def confirm_handoff(shift_id: str, nurse_id: str, summaries: list[SBARSummary]) -> None:
    """
    Marks the shift as confirmed and stores the final (possibly nurse-edited) summaries.
    In production this would UPDATE the shifts table and INSERT into handoff_confirmations.
    """
    store = _load_store()
    shift = store["shifts"].get(shift_id)
    if not shift:
        raise ValueError(f"Shift '{shift_id}' not found.")

    confirmed_at = datetime.now(timezone.utc).isoformat()
    shift["status"]             = "confirmed"
    shift["confirmed_at"]       = confirmed_at
    shift["confirmed_by"]       = nurse_id
    shift["generated_summaries"] = [s.model_dump() for s in summaries]

    _append_audit(store, "handoff_confirmed", {
        "shift_id": shift_id,
        "confirmed_by": nurse_id,
        "confirmed_at": confirmed_at,
    })
    _save_store(store)


def get_confirmed_summaries(shift_id: str) -> Optional[list[SBARSummary]]:
    """
    Retrieves the confirmed summaries for a shift (for the incoming nurse).
    Returns None if the shift doesn't exist or hasn't been confirmed yet.
    """
    shift = get_shift(shift_id)
    if not shift or shift.get("status") != "confirmed":
        return None

    raw = shift.get("generated_summaries") or []
    return [SBARSummary.model_validate(s) for s in raw]
