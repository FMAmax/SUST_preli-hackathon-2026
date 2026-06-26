# Design Spec — `agent.md` for the bKash Support-Copilot Hackathon API

- **Date:** 2026-06-26
- **Status:** Approved design — pending spec review
- **Source documents:** `SUST_Preli_Evaluation_Rubric_Sanitized.md`, `SUST_Preli_Team_Instructions_Manual_Sanitized.md`
- **Deliverable this spec describes:** a single `agent.md` file at the repo root.

## 1. Purpose & audience

`agent.md` is the **operating manual for the AI coding agents (Puku / Codex / Claude) and the human team** building the preliminary-round API service. It distills the rubric (how we're judged) and the manual (how we execute and submit) into one rubric-first source of truth, so that when the 4-hour clock starts and the Problem Statement appears, the team and its agents move fast and don't lose points on the knowable parts (schema discipline, safety, Vercel deploy, reliability).

It is **not** the support bot's own LLM system prompt, and **not** a generic README. It is build-and-operate guidance.

## 2. What it is / isn't

- **Is:** a pre-round prep scaffold. Everything knowable from the rubric + manual is baked in now. The parts that live only in the not-yet-released Problem Statement (exact input/output schema, enum values, exact main-endpoint name) are left as clearly-marked `FILL FROM PROBLEM STATEMENT` slots.
- **Isn't:** code, the bot persona, or a UI spec.

## 3. Locked decisions

| Decision | Choice |
|---|---|
| Document role | Coding-agent operating manual + pre-round prep scaffold |
| Schema handling | Bake in knowable guidance; mark schema/enums/endpoint as fill-in slots |
| Stack | Next.js + TypeScript, Zod validation, native Vercel deploy |
| Architecture | Hybrid — deterministic shell wrapping an LLM core |
| LLM provider | Swappable `lib/llm.ts` slot, default **Claude Haiku 4.5**, deterministic fallback always present |

## 4. Architecture it prescribes

```
POST /analyze-ticket
  → Zod-validate input
  → assemble evidence context from supplied case data
  → LLM core: evidence reasoning + draft (summary / next action / customer reply)
  → deterministic SAFETY filter (enforced, not advisory)
  → Zod-validate output (fields, types, enums)
  → respond
        ↘ on LLM timeout/error/missing key → deterministic fallback path
```

- **Deterministic layer owns** (never delegated to the model): input/output schema + enum validation, the safety filter, escalation/routing rules, and a fallback path so a slow or failed LLM call never returns a 5xx or times out.
- **LLM layer owns:** evidence reasoning, the review-decision rationale, and drafting the customer-facing text.
- **Rationale:** the manual explicitly recommends a hybrid rule + AI system; this keeps the two things we cannot get wrong — safety and schema — fully deterministic, while the LLM lifts Evidence Reasoning (35 pts) and Response Quality (10 pts). The always-present fallback is also tie-breaker #5 (robust fallback design) and our reliability net if the provider rate-limits during judging.

## 5. Document structure (the 11 sections)

1. **Mission & priority order** — one-paragraph mission; the 7 scoring categories with weights; the build order (schema/endpoints → evidence reasoning → safety → reliability → docs); the 8 tie-breakers.
2. **API contract — the slots** — `GET /health` → exactly `{"status":"ok"}` (<60s of start); `POST /analyze-ticket` (⚠️ confirm exact name) with request schema / response schema / enum values / status codes as `FILL FROM PROBLEM STATEMENT` blocks. Hard rules: exact field names/types/enums, `application/json` only, 30s timeout, controlled errors — never crash.
3. **Architecture** — the hybrid flow above with the deterministic-vs-LLM responsibility split.
4. **Safety guardrails (hard requirements)** — the penalties as enforceable rules; "recommend a review, never promise action"; escalation triggers; the "2+ critical violations = not top-40" gate. Implemented as a deterministic checklist every customer-facing string must pass, plus prompt-level instructions (defense in depth).
5. **Reliability & performance** — p95 ≤ 5s target / 30s ceiling / health < 60s; LLM timeout + fallback; stateless, graceful degradation; safe caching & cost-aware usage.
6. **Project structure & commands** — Next.js + TS layout (`app/api/health/route.ts`, `app/api/analyze-ticket/route.ts`, `lib/schema.ts`, `lib/safety.ts`, `lib/reasoning.ts`, `lib/llm.ts`); dev/build commands; Vercel deploy specifics (env vars in dashboard, serverless readiness, the /health check).
7. **Secrets & repo hygiene** — `.env.example` placeholders only; real secrets only in Vercel env / the private submission field; private-repo organizer access; temporary keys, rotate after.
8. **Testing & pre-submit checklist** — the manual's checklist as a gate (health, all fields, exact enums, empty/malformed handled, reply never asks for sensitive info, never promises unauthorized actions, within timeout, README complete).
9. **Deliverables & submission** — README contents; submission-form fields; deployment-path priority (Vercel endpoint preferred → Docker → code-only).
10. **Do-Not list** — the manual's "What Not to Do," distilled.
11. **Working agreement for AI coding agents** — schema-first; safety is non-negotiable; deterministic-first (prefer rules where rules suffice); small testable functions; ask before adding scope.

## 6. Reference facts to embed (from the source docs)

- **Scoring weights:** Evidence Reasoning 35 · Safety & Escalation 20 · API Contract & Schema 15 · Performance & Reliability 10 · Response Quality 10 · Deployment & Reproducibility 5 · Documentation 5.
- **Safety penalties:** request PIN/OTP/password/secret credentials −15 · perform unauthorized actions −10 · direct user to suspicious third parties −10 · 2+ critical violations → not eligible for top-40.
- **API metrics:** health `{"status":"ok"}` within 60s · per-request ≤30s · p95 full credit ≤5s, partial ≤15s, minimal ≤30s · no 5xx/invalid-JSON/no-response on valid input · exact schema+enums · controlled error on bad input · no secrets in repo/logs/responses.
- **Tie-breakers (order):** 1 safety & no critical violations · 2 evidence reasoning · 3 API/schema validity · 4 reliability/timeout/deploy stability · 5 exceptional engineering (optimization, cost-aware models, caching, monitoring, robust fallback) · 6 language handling · 7 documentation/verification · 8 90-second architecture video.
- **Deployment priority:** 1 working endpoint URL + GitHub repo (preferred) · 2 lightweight Docker fallback · 3 code-only reproducibility.
- **Inferred main endpoint:** `POST /analyze-ticket` (manual references testing `/health` and `/analyze-ticket`) — mark as confirm-from-Problem-Statement.

## 7. Open slots (fill when the Problem Statement drops)

- Exact main-endpoint path and method.
- Request JSON schema (field names, types, required vs optional).
- Response JSON schema (field names, types).
- All enum values and their exact spelling.
- Expected HTTP status codes per case.

## 8. Success criteria

The `agent.md` is good if a coding agent or teammate can, reading only it plus the eventual Problem Statement: stand up the two endpoints with exact-schema responses, implement the hybrid reasoning + deterministic safety filter, deploy to Vercel reachably, and pass the pre-submit checklist — without re-reading the rubric or manual.

## 9. Out of scope (YAGNI)

- Frontend/UI (explicitly not judged).
- Heavy Docker setup (Vercel endpoint is the preferred path; Docker gets a one-line fallback mention only).
- The bot's conversational system prompt (separate artifact if ever needed).
