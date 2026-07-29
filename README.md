# Nurse Handoff Service — NurseSync

## Overview

NurseSync is an AI-powered nurse handoff system that automates the generation of structured **SBAR** (Situation, Background, Assessment, Recommendation) summaries at shift change. It ingests patient chart data and shift notes, then calls GPT-4o to synthesize each patient's clinical picture into a standardized, priority-ranked handoff summary. The outgoing nurse reviews and confirms the summaries; the incoming nurse retrieves the confirmed record.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | FastAPI 0.115.0, Python 3.11+, Uvicorn |
| AI | OpenAI GPT-4o (configurable) |
| Data Validation | Pydantic v2 |
| Persistence | JSON flat-files (designed to swap to PostgreSQL) |
| Frontend | React 18, Vite, Tailwind CSS |

---

## API

The API runs on **port 8000**. All endpoints consume and return JSON.

### Endpoints

#### `GET /health`
Health check. Returns service name, version, active model, and timestamp.

---

#### `POST /shift/load`
Registers a shift and returns full patient chart data for the assigned patients.

**Request:**
```json
{
  "shift_id": "shift_20250311_day",
  "nurse_id": "nurse_sarah_mitchell",
  "patient_ids": ["pt_001", "pt_002", "pt_003"]
}
```

**Response:** Shift metadata + array of full patient objects (vitals, medications, pending orders, alerts, nurse notes).

Idempotent — re-loading an existing shift returns the current state including any notes recorded so far.

---

#### `POST /notes/add`
Appends a timestamped nurse note to a patient's shift record.

**Request:**
```json
{
  "shift_id": "shift_20250311_day",
  "patient_id": "pt_001",
  "note_text": "Patient alert and orientated. Persistent cough noted..."
}
```

The timestamp (`HH:MM`) is auto-stamped at time of call. Notes are included in the AI prompt when summaries are generated.

---

#### `POST /summary/generate`
The core AI pipeline. Generates SBAR summaries for all patients in the shift concurrently.

**Request:**
```json
{
  "shift_id": "shift_20250311_day",
  "nurse_id": "nurse_sarah_mitchell"
}
```

**Response:** Array of per-patient results, each containing:

```json
{
  "patient_id": "pt_001",
  "success": true,
  "summary": {
    "patient_id": "pt_001",
    "priority": "critical",
    "situation": "72-year-old female with community-acquired pneumonia...",
    "background": "Admitted 09 Mar with productive cough...",
    "assessment": "Clinical deterioration with hypoxia and fever...",
    "recommendation": "1. Continue IV antibiotics...\n2. Repeat CXR...",
    "flags": ["IV antibiotic dose pending", "Repeat CXR awaiting porter"],
    "generated_at": "2025-03-11T19:00:00Z"
  }
}
```

**Priority classification** is rule-based and enforced in the system prompt:
- **Critical:** SpO2 < 92%, HR > 110 or < 50, Temp > 38.5°C, RR > 22, SBP < 90, unresolved alert, or acute deterioration
- **Watch:** Borderline vitals, pending non-urgent orders, or nurse-noted concern
- **Stable:** All vitals within normal range, no unresolved alerts, medications on schedule

Failures are isolated per-patient — one GPT error never aborts the batch. Summaries are persisted as `"draft"` status.

---

#### `POST /handoff/confirm`
Locks the shift summaries as confirmed. Accepts the (potentially nurse-edited) summaries.

**Request:**
```json
{
  "shift_id": "shift_20250311_day",
  "nurse_id": "nurse_sarah_mitchell",
  "summaries": [ /* array of SBARSummary objects */ ]
}
```

**Response:** Confirmation record with timestamp and confirmed-by nurse ID. Returns `409 Conflict` if the shift is already confirmed.

---

#### `GET /handoff/{shift_id}`
Retrieves the confirmed handoff record for the incoming nurse. Returns `404` if the shift does not exist or has not been confirmed.

---

### AI Pipeline

For each patient, the pipeline runs in this order:

```
build_user_prompt()     →  Assembles chart data + shift notes into structured text
get_system_prompt()     →  Static SBAR rules, priority criteria, output JSON schema
call_gpt()              →  OpenAI API (temp: 0.2, max_tokens: 700, response_format: json_object)
parse_and_validate()    →  Parses raw JSON → validates against SBARSummary Pydantic schema
```

GPT is instructed to return **valid JSON only** (no markdown, no preamble), never infer details not present in the chart, and use clinical language throughout. The API client uses `response_format: json_object` to enforce this at the protocol level. Retries on `RateLimitError` with exponential backoff (max 2 retries).

---

### Data Models

```
Patient
  ├── patient_id, name, age, bed, diagnosis, admission_date
  ├── Vitals (hr, bp, temp, rr, spo2, last_updated)
  ├── Medication[] (name, route, due, status)
  ├── pending_orders: str[]
  ├── alerts: str[]
  └── nurse_notes: NurseNote[] (time, text)

SBARSummary
  ├── patient_id
  ├── priority: "critical" | "watch" | "stable"
  ├── situation, background, assessment, recommendation
  ├── flags: str[]
  └── generated_at: datetime
```

---

### Persistence Layer

`data_store.py` abstracts all persistence behind a clean interface, using two JSON files:

- `patients.json` — read-only EMR source (static patient chart data)
- `runtime_store.json` — mutable state (shifts, notes, summaries, audit log)

The module's public API is intentionally designed to swap out the JSON backend for PostgreSQL/SQLAlchemy without changing any calling code. An append-only **audit log** records every action (shift created, note added, summaries generated, handoff confirmed) with timestamps, supporting compliance and debugging.

---

### Configuration

Configured via `.env` (see `.env.example`):

```env
OPENAI_API_KEY=sk-...
MODEL_NAME=gpt-4o
TEMPERATURE=0.2
MAX_TOKENS=700
MAX_RETRIES=2
```

---

### Testing

Unit and integration tests live in `api/tests/`:
- `test_gpt_service.py` — mocked OpenAI responses
- `test_prompt_builder.py` — prompt assembly correctness
- `test_summary_parser.py` — JSON parsing and schema validation
- `test_integration.py` — end-to-end API tests via `httpx`

A Postman collection (`NurseSync_Postman_Collection.json`) is included for manual testing of the full workflow.

---

## Frontend

The React frontend (Vite + Tailwind CSS, port 5173) provides a single-page interface for the full handoff workflow:

1. **Dashboard** — Patient list with priority badges (critical/watch/stable), vitals snapshot, alert counts, and pending medication indicators.
2. **Patient Detail** — Full chart view per patient (vitals, medications, pending orders, alerts, chronological notes) with an inline form to add new nurse notes.
3. **Handoff Summary** — Triggers summary generation, displays the AI-generated SBAR cards grouped by priority, allows inline editing of any field, then submits the final confirmed handoff.

The API client normalizes snake_case ↔ camelCase between the backend and React components. Shift/nurse/patient IDs are hardcoded constants for the current PoC scope.

---

## Workflow Summary

```
Outgoing nurse loads shift       →  POST /shift/load
Adds notes throughout shift      →  POST /notes/add  (multiple calls)
Generates AI summaries           →  POST /summary/generate
Reviews & edits summaries        →  (frontend only, client-side)
Confirms handoff                 →  POST /handoff/confirm
Incoming nurse retrieves record  →  GET  /handoff/{shift_id}
```
