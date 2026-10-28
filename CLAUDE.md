# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

IELTS AI Practice Platform: a FastAPI + React app for practicing the four IELTS
modules (Speaking, Writing, Listening, Reading) with AI-generated content and
AI-graded band scores, powered entirely by a **locally-hosted** Ollama model
(qwen2.5:3b) instead of a cloud LLM API. Speaking also integrates local Piper
(TTS) and Whisper (STT) services.

## Commands

Backend (from `backend/`, with the committed `venv` activated):
```
uvicorn app.main:app --reload          # dev server on :8000, docs at /docs
python test_ai.py                      # ad hoc smoke test of Ollama integration (not a real test suite)
python scripts/seed_data.py            # seed the database with sample questions/passages
```
There is no pytest suite, no lint config, and no migrations command for the backend.

Frontend (from `frontend/`):
```
npm run dev        # Vite dev server on :5173
npm run build       # production build
npm run lint        # eslint .
npm run preview
```

No test runner is configured on either side — verify backend changes by hitting
endpoints via `/docs` (Swagger UI) or `test_ai.py`, and verify frontend changes
by running the dev server.

## Architecture

**Backend layering** (`backend/app/`): routers → `curd.py` → `models.py`, with
Pydantic I/O types in `shemas.py` and all AI calls isolated in
`services/ollama_service.py`. Note the filenames are intentionally-not-intentional
typos — it's `curd.py` (not `crud.py`) and `shemas.py` (not `schemas.py`); search
for these exact names. `curd.py` is meant to be the only file that touches the DB
session directly — routers should not issue queries themselves.

**Offline/live content pattern**: each module (speaking/writing/listening/reading)
follows the same two-phase design, visible in `routers/speaking.py`:
- *Offline phase*: an admin-only `generate-*` endpoint calls `ollama_service` to
  generate + validate content, then persists it (e.g. `SpeakingQuestion`).
- *Live phase*: students fetch pre-generated content from the DB (fast, no LLM
  call). A `*-live` fallback endpoint exists for on-demand generation when
  nothing is in the DB yet, returning ungenerated content without storing it.
Scoring endpoints (`/score/{session_id}`) call `ollama_service` synchronously to
grade transcripts/essays against IELTS band criteria and write scores back onto
the session/submission row.

**Database**: PostgreSQL via SQLAlchemy 2.0, UUID primary keys. There are no
Alembic migrations — `database.py:create_tables()` runs `Base.metadata.create_all()`
on every app startup (see `main.py` lifespan handler), so schema changes just
mean editing `models.py` and restarting. `drop_tables()` exists for a full reset
during local dev.

**Auth**: JWT via `python-jose`, hashed with `passlib[bcrypt]`. `auth.py` hardcodes
`SECRET_KEY` rather than reading the `SECRET_KEY` in `.env` — the two are
currently out of sync; if you touch auth, decide whether to wire `auth.py` to
`config.load_env()`/`os.getenv` or leave as-is, but don't assume `.env`'s
`SECRET_KEY` is actually in effect.

**Config loading**: `config.py:load_env()` is a hand-rolled `.env` parser (not
python-dotenv) used by both `database.py` and `services/ollama_service.py`. It
uses `setdefault`, so real environment variables always win over `.env` values.

**CORS**: origins are hardcoded in `main.py` to `localhost:5173`/`:3000`/`127.0.0.1:5173`.

**File uploads**: audio is written to a relative `uploads/audio/` path (e.g. in
`routers/speaking.py:upload_audio`), so it lands wherever the server process's
cwd is — not necessarily `backend/uploads/`. There are duplicate empty
`uploads/` dirs at both the repo root and inside `backend/`.

**Frontend structure** (`frontend/src/`): one `pages/<Module>Page.jsx` +
`hooks/use<Module>.js` + `components/<module>/` per IELTS module, following the
same speaking/writing/listening/reading split as the backend. `AuthContext.jsx`
holds auth state; routes are guarded by a `ProtectedRoute` wrapper in `App.jsx`.
`services/api.js` is a single shared Axios instance — note its `baseURL` is
hardcoded to `http://localhost:8000/api` rather than reading `VITE_API_URL` from
`.env`, so that env var currently has no effect; update `api.js` if you need to
change the backend URL.
