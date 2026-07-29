from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class Priority(str, Enum):
    critical = "critical"
    watch = "watch"
    stable = "stable"


class MedicationStatus(str, Enum):
    given = "given"
    pending = "pending"
    running = "running"
    available = "available"


# ---------------------------------------------------------------------------
# Patient Chart Data (mirrors what an EMR would provide)
# ---------------------------------------------------------------------------

class Vitals(BaseModel):
    hr: int = Field(..., description="Heart rate in bpm")
    bp: str = Field(..., description="Blood pressure as 'systolic/diastolic'")
    temp: float = Field(..., description="Body temperature in Celsius")
    rr: int = Field(..., description="Respiratory rate per minute")
    spo2: int = Field(..., description="Oxygen saturation percentage")
    last_updated: str = Field(..., description="Time of last reading, HH:MM format")


class Medication(BaseModel):
    name: str
    route: str
    due: str
    status: MedicationStatus


class NurseNote(BaseModel):
    time: str = Field(..., description="Timestamp of the note, HH:MM format")
    text: str


class Patient(BaseModel):
    patient_id: str
    name: str
    age: int
    bed: str
    diagnosis: str
    admission_date: str
    vitals: Vitals
    medications: List[Medication] = []
    pending_orders: List[str] = []
    alerts: List[str] = []
    nurse_notes: List[NurseNote] = []


# ---------------------------------------------------------------------------
# Request / Response models for the service layer
# (These will also be used directly by the routes once we add them)
# ---------------------------------------------------------------------------

class GenerateSummaryRequest(BaseModel):
    """
    Submitted at shift end to trigger SBAR generation.
    If patients is omitted the route auto-loads them from the registered shift.
    """
    shift_id: str
    nurse_id: str
    patients: Optional[List[Patient]] = None


class SBARSummary(BaseModel):
    """One structured handoff summary for a single patient."""
    patient_id: str
    priority: Priority
    situation: str
    background: str
    assessment: str
    recommendation: str
    flags: List[str] = []
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class PatientSummaryResult(BaseModel):
    """
    Wraps the result for one patient so that failures are isolated —
    a GPT error on one patient doesn't abort the whole batch.
    """
    patient_id: str
    success: bool
    summary: Optional[SBARSummary] = None
    error: Optional[str] = None


class GenerateSummaryResponse(BaseModel):
    shift_id: str
    status: str = "draft"
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    results: List[PatientSummaryResult]


class AddNoteRequest(BaseModel):
    shift_id: str
    patient_id: str
    note_text: str


class AddNoteResponse(BaseModel):
    patient_id: str
    time: str
    message: str


class ConfirmHandoffRequest(BaseModel):
    """
    Sent after the nurse reviews the draft summaries.
    The summaries list may contain nurse edits — we store whatever is confirmed.
    """
    shift_id: str
    nurse_id: str
    summaries: List[SBARSummary]


class ConfirmHandoffResponse(BaseModel):
    shift_id: str
    confirmed_at: datetime
    confirmed_by: str
    status: str = "confirmed"
    summary_count: int
