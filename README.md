# QueueStorm Investigator — Support-Copilot API

AI/API service exposing `GET /health` and `POST /analyze-ticket` for finance support triage.

## Tech stack
Next.js 14 (App Router) · TypeScript · Zod · Vitest · Claude Haiku 4.5 (optional prose assist).

## Setup & run
1. `npm install`
2. Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY` (optional — the service runs fully without it).
3. `npm run dev` then test: `curl localhost:3000/api/health`

## API
- `GET /health` -> `{"status":"ok"}`
- `POST /analyze-ticket` -> structured verdict (see Problem Statement schema). Sample request/response below.

## AI approach
Rules-first: a deterministic core decides every scored field (transaction match, evidence verdict, case type, severity, routing, escalation) and enforces safety + schema. Claude Haiku 4.5 only polishes prose and is fully optional (deterministic templates are the floor).

## Safety logic
Every `customer_reply` and `recommended_next_action` passes a deterministic filter: never asks for PIN/OTP/password, never promises a refund/reversal (uses "any eligible amount will be returned through official channels"), never directs to third parties, and ignores instructions embedded in complaints. Flagged LLM output is discarded in favor of the safe template.

## MODELS
- claude-haiku-4-5 — hosted by Anthropic, called via @anthropic-ai/sdk. Chosen for low latency and cost; used only for optional prose polishing with a deterministic fallback, so the service never hard-depends on it. No model is bundled or run locally.

## Cost reasoning
At most one short Haiku call per request (~768 max tokens); skipped entirely when no API key is present. Optional caching avoids repeat calls.

## Assumptions & limitations
- `language="mixed"` is served with English templates plus Bangla-script detection.
- Reasoning is heuristic over the supplied history; ambiguous cases return `insufficient_data` and ask for clarification rather than guessing.