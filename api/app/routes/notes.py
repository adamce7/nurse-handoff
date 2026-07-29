"""
notes.py
--------
POST /notes/add

Appends a timestamped nurse note to a patient's record within an active shift.
Notes are persisted to runtime_store.json and are included when generating summaries.
"""

from fastapi import APIRouter, HTTPException

from app.models.schemas import AddNoteRequest, AddNoteResponse
from app.services import data_store

router = APIRouter()


@router.post("/add", response_model=AddNoteResponse, summary="Add a nurse note for a patient")
def add_note(body: AddNoteRequest):
    """
    Appends a timestamped note to the patient's shift record.

    - Raises 404 if the shift does not exist.
    - Raises 422 if the patient is not assigned to the shift.
    """
    try:
        note = data_store.add_note(body.shift_id, body.patient_id, body.note_text)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return AddNoteResponse(
        patient_id=body.patient_id,
        time=note.time,
        message="Note recorded successfully.",
    )
