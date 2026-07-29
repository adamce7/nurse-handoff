"""
shift.py
--------
POST /shift/load

Registers a new shift and returns the patient list for that shift.
The nurse submits shift_id, nurse_id, and the patient_ids they are responsible for.
The data store creates the shift record; the response contains fully hydrated Patient objects.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

from app.services import data_store

router = APIRouter()


class LoadShiftRequest(BaseModel):
    shift_id: str
    nurse_id: str
    patient_ids: List[str]


@router.post("/load", summary="Register a new shift and load its patients")
def load_shift(body: LoadShiftRequest):
    """
    Creates a shift record in the data store and returns the hydrated patient list.

    - If the shift_id already exists the call is idempotent and returns the existing patients.
    - Unknown patient_ids are silently omitted (patients.json is the source of truth).
    """
    # Avoid duplicate shift creation — return existing patients if shift already registered
    existing = data_store.get_shift(body.shift_id)
    if not existing:
        data_store.create_shift(body.shift_id, body.nurse_id, body.patient_ids)

    patients = data_store.get_shift_patients(body.shift_id)
    if not patients:
        raise HTTPException(
            status_code=404,
            detail=f"No matching patients found for the provided patient_ids. "
                   "Verify the IDs exist in patients.json.",
        )

    return {
        "shift_id": body.shift_id,
        "nurse_id": body.nurse_id,
        "patient_count": len(patients),
        "patients": [p.model_dump() for p in patients],
    }
