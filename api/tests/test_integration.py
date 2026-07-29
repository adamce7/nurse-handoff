"""
test_integration.py
-------------------
End-to-end pipeline tests.

Two modes:
  1. MOCKED (default, always runs) — the full pipeline is exercised but GPT is
     mocked. Validates that all layers wire together correctly.

  2. LIVE (opt-in, requires a valid .env) — makes a real GPT-4o API call.
     Run with:  pytest -m live
     Skip with: pytest -m "not live"  (default behaviour)

The live test is the ultimate proof that the system works end-to-end.
"""

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.models.schemas import (
    GenerateSummaryRequest,
    Priority,
)
from app.services.nurse_handoff_service import (
    generate_patient_summary,
    generate_shift_summaries,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_mock_openai_response(json_str: str):
    mock_message = MagicMock()
    mock_message.content = json_str

    mock_choice = MagicMock()
    mock_choice.message = mock_message

    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    return mock_response


# ---------------------------------------------------------------------------
# Mocked integration tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_single_patient_pipeline_success(
    critical_patient, valid_gpt_response_critical
):
    """Full pipeline for one patient: prompt → (mocked) GPT → parse → result."""
    mock_response = _make_mock_openai_response(valid_gpt_response_critical)

    with patch("app.services.gpt_service._client") as mock_client:
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        result = await generate_patient_summary(critical_patient)

    assert result.success is True
    assert result.summary is not None
    assert result.summary.patient_id == "pt_001"
    assert result.summary.priority == Priority.critical
    assert len(result.summary.flags) > 0
    assert result.error is None


@pytest.mark.asyncio
async def test_single_patient_pipeline_gpt_failure(critical_patient):
    """If GPT raises, the result captures the error rather than propagating it."""
    with patch("app.services.gpt_service._client") as mock_client:
        mock_client.chat.completions.create = AsyncMock(
            side_effect=RuntimeError("Simulated API failure")
        )
        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await generate_patient_summary(critical_patient)

    assert result.success is False
    assert result.summary is None
    assert "Simulated API failure" in result.error


@pytest.mark.asyncio
async def test_batch_all_succeed(
    critical_patient, watch_patient, stable_patient,
    valid_gpt_response_critical, valid_gpt_response_stable
):
    """All three patients processed concurrently — each gets a valid summary."""
    watch_response = json.dumps({
        "patient_id": "pt_002",
        "priority": "watch",
        "situation": "James Thornton, 58M, post-op day 2. Reported nausea, managed with ondansetron.",
        "background": "Laparoscopic appendectomy 09/03. Tolerating oral fluids. Pain 4/10.",
        "assessment": "Clinically stable. Borderline HR 98. Nausea episode this shift, resolved.",
        "recommendation": "1. Administer Metoclopramide 10mg IV at 18:00.\n2. Perform wound check and dressing change at 18:00.\n3. Follow up on physiotherapy consult.",
        "flags": ["Metoclopramide IV due at 18:00", "Wound check pending", "Physiotherapy consult not yet completed"],
    })

    responses = [valid_gpt_response_critical, watch_response, valid_gpt_response_stable]
    call_count = 0

    async def mock_create(**kwargs):
        nonlocal call_count
        response = _make_mock_openai_response(responses[call_count % len(responses)])
        call_count += 1
        return response

    request = GenerateSummaryRequest(
        shift_id="shift_20250311_day",
        nurse_id="nurse_sarah_mitchell",
        patients=[critical_patient, watch_patient, stable_patient],
    )

    with patch("app.services.gpt_service._client") as mock_client:
        mock_client.chat.completions.create = AsyncMock(side_effect=mock_create)
        response = await generate_shift_summaries(request)

    assert response.shift_id == "shift_20250311_day"
    assert response.status == "draft"
    assert len(response.results) == 3
    assert all(r.success for r in response.results)


@pytest.mark.asyncio
async def test_batch_partial_failure(
    critical_patient, watch_patient, stable_patient,
    valid_gpt_response_critical, valid_gpt_response_stable
):
    """One patient failing should not abort the other two."""
    import openai

    call_count = 0

    async def mock_create(**kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 2:
            # Fail the second patient
            raise openai.APIError("Simulated failure", request=MagicMock(), body={})
        responses = [valid_gpt_response_critical, valid_gpt_response_stable]
        return _make_mock_openai_response(responses[(call_count - 1) % 2])

    request = GenerateSummaryRequest(
        shift_id="shift_test",
        nurse_id="nurse_001",
        patients=[critical_patient, watch_patient, stable_patient],
    )

    with patch("app.services.gpt_service._client") as mock_client:
        mock_client.chat.completions.create = AsyncMock(side_effect=mock_create)
        response = await generate_shift_summaries(request)

    successes = [r for r in response.results if r.success]
    failures  = [r for r in response.results if not r.success]
    assert len(successes) == 2
    assert len(failures) == 1


# ---------------------------------------------------------------------------
# Live test — opt-in only, requires valid OPENAI_API_KEY in .env
# ---------------------------------------------------------------------------

@pytest.mark.live
@pytest.mark.asyncio
async def test_live_single_patient(critical_patient):
    """
    Makes a real GPT-4o API call. Run with: pytest -m live
    Requires OPENAI_API_KEY set in api/.env
    """
    result = await generate_patient_summary(critical_patient)

    assert result.success is True, f"Live test failed: {result.error}"
    assert result.summary.patient_id == "pt_001"
    assert result.summary.priority in (Priority.critical, Priority.watch)
    assert len(result.summary.situation) > 10
    assert len(result.summary.recommendation) > 10
    assert isinstance(result.summary.flags, list)
