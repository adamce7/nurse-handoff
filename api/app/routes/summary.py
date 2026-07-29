"""
summary.py
----------
POST /summary/generate

Triggers GPT-4o SBAR generation for all patients in a shift.
Patients are processed concurrently; per-patient failures are isolated and reported
in the results array rather than aborting the whole batch.

The generated summaries are saved as "draft" — they become "confirmed" only after
the nurse reviews and calls POST /handoff/confirm.
"""

from fastapi import APIRouter, HTTPException

from app.models.schemas import GenerateSummaryRequest, GenerateSummaryResponse
from app.services.nurse_handoff_service import generate_shift_summaries
from app.services import data_store

router = APIRouter()


@router.post("/generate", response_model=GenerateSummaryResponse, summary="Generate SBAR summaries for a shift")
async def generate_summaries(body: GenerateSummaryRequest):
    """
    Calls GPT-4o for each patient concurrently and returns draft SBAR summaries.

    Accepts patients either inline in the request body (for direct API testing)
    or auto-loaded from the shift record when only shift_id is provided and no
    patients are included — whichever is more convenient for the caller.

    The draft summaries are persisted so the nurse can review before confirming.
    """
    # If no patients were sent inline, load them from the registered shift
    if not body.patients:
        shift = data_store.get_shift(body.shift_id)
        if not shift:
            raise HTTPException(
                status_code=404,
                detail=f"Shift '{body.shift_id}' not found. Call POST /shift/load first.",
            )
        patients = data_store.get_shift_patients(body.shift_id)
        if not patients:
            raise HTTPException(
                status_code=404,
                detail=f"No patients found for shift '{body.shift_id}'.",
            )
        body = GenerateSummaryRequest(
            shift_id=body.shift_id,
            nurse_id=body.nurse_id,
            patients=patients,
        )

    response = await generate_shift_summaries(body)

    # Persist draft summaries — only the successful ones
    successful_summaries = [
        r.summary for r in response.results if r.success and r.summary
    ]
    if successful_summaries:
        try:
            data_store.save_summaries(body.shift_id, successful_summaries)
        except ValueError:
            # Shift not registered — summaries still returned to caller, just not persisted
            pass

    return response
