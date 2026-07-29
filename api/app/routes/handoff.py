"""
handoff.py
----------
POST /handoff/confirm  — nurse reviews and locks the handoff
GET  /handoff/{shift_id} — incoming nurse retrieves confirmed handoff
"""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    ConfirmHandoffRequest,
    ConfirmHandoffResponse,
)
from app.services import data_store

router = APIRouter()


@router.post("/confirm", response_model=ConfirmHandoffResponse, summary="Confirm and lock the handoff")
def confirm_handoff(body: ConfirmHandoffRequest):
    """
    Nurse reviews the draft SBAR summaries (optionally editing them) and confirms the handoff.
    Once confirmed the shift is locked — the incoming nurse can retrieve it via GET /handoff/{shift_id}.

    - Raises 404 if the shift does not exist.
    - Raises 409 if the shift has already been confirmed.
    """
    shift = data_store.get_shift(body.shift_id)
    if not shift:
        raise HTTPException(
            status_code=404,
            detail=f"Shift '{body.shift_id}' not found. Call POST /shift/load first.",
        )
    if shift.get("status") == "confirmed":
        raise HTTPException(
            status_code=409,
            detail=f"Shift '{body.shift_id}' has already been confirmed.",
        )

    data_store.confirm_handoff(body.shift_id, body.nurse_id, body.summaries)
    confirmed_at = datetime.now(timezone.utc)

    return ConfirmHandoffResponse(
        shift_id=body.shift_id,
        confirmed_at=confirmed_at,
        confirmed_by=body.nurse_id,
        status="confirmed",
        summary_count=len(body.summaries),
    )


@router.get("/{shift_id}", summary="Retrieve confirmed handoff for the incoming nurse")
def get_handoff(shift_id: str):
    """
    Returns the confirmed SBAR summaries for a shift.
    Used by the incoming nurse at the start of their shift.

    - Raises 404 if the shift doesn't exist or hasn't been confirmed yet.
    """
    summaries = data_store.get_confirmed_summaries(shift_id)
    if summaries is None:
        shift = data_store.get_shift(shift_id)
        if not shift:
            raise HTTPException(status_code=404, detail=f"Shift '{shift_id}' not found.")
        raise HTTPException(
            status_code=404,
            detail=f"Shift '{shift_id}' exists but has not been confirmed yet (status: {shift.get('status')}).",
        )

    return {
        "shift_id": shift_id,
        "status": "confirmed",
        "summary_count": len(summaries),
        "summaries": [s.model_dump() for s in summaries],
    }
