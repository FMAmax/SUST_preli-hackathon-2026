# agent.md — bKash Support-Copilot Hackathon API

> **Operating manual for the AI coding agents (Puku / Codex / Claude) and the team building this service.**
> This file distills the [Evaluation Rubric](SUST_Preli_Evaluation_Rubric_Sanitized.md) (how we're judged) and the [Team Instructions Manual](SUST_Preli_Team_Instructions_Manual_Sanitized.md) (how we execute & submit) into one rubric-first source of truth. Read this before writing code. When the Problem Statement is released, fill the **slots** in §2 and stop guessing the contract.
>
> **Build order is the law:** schema/endpoints → evidence reasoning → safety → reliability → docs. Never trade safety for confidence.

---

## 1. Mission & scoring-driven priorities

Build a **safe, reliable, evidence-grounded AI/API service** that reads a customer-support case, reasons from the supplied evidence, produces the right review outcome, escalates risky/uncertain cases to humans, and drafts a useful, safe customer reply. It is a **support copilot, not an authority** — it recommends, it never promises actions it cannot guarantee.

### Scoring categories (total 100)

| # | Category | Weight | What it measures |
|---|---|---|---|
| 1 | **Evidence Reasoning** | **35** | Reason from supplied case data → correct, evidence-backed review decision. The core score. |
| 2 | **Safety & Escalation** | **20** | Avoid unsafe behaviour, protect sensitive info, route risky/uncertain cases to human review. |
| 3 | **API Contract & Schema** | **15** | Exact fields, types, enum values, HTTP codes. Wrong JSON shape = unscoreable reasoning. |
| 4 | **Performance & Reliability** | **10** | Fast, stable under judging, survives unexpected input without crashing. |
| 5 | **Response Quality** | **10** | Clear summary, practical next action, professional customer reply (manual review). |
| 6 | **Deployment & Reproducibility** | **5** | Judges can reach/run the service with zero hand-holding. |
| 7 | **Documentation** | **5** | README explains setup, AI usage, safety logic, limitations (manual review). |

### Build order (from the manual's final advice — do these in sequence)

1. **Schema & endpoints correct first.** Without valid JSON + endpoints, the judge cannot score anything.
2. **Evidence-based reasoning** over the supplied case data. The largest score lives here.
3. **Safety guardrails** before polishing text. Unsafe replies ruin a high score.
4. **Reliability & reachability** under the judge harness.
5. **README + AI/model usage + safety logic + limitations.**

### Tie-breakers (what separates close teams, in order)

1. Safety score & **absence of critical violations** → 2. Evidence reasoning → 3. API/schema validity → 4. Reliability/timeout/deploy stability → 5. **Engineering excellence** (optimization, cost-aware model usage, caching, monitoring, robust fallback) → 6. Local-language handling → 7. Documentation/verification → 8. 90-second architecture video.

> **Implication:** items 1 and 5 are things we control directly — bake deterministic safety + a robust LLM fallback in from the start.

---

## 2. API contract — ⚠️ SLOTS (fill from Problem Statement)

Two endpoints, callable directly from the submitted base URL — **no login, dashboard, or manual approval**. JSON in, JSON out, `Content-Type: application/json`.

### `GET /health` — known, do not change
Returns **exactly** `{"status":"ok"}` and must respond within **60 seconds** of service start.

### `POST /analyze-ticket` — ⚠️ confirm exact name & schema from Problem Statement
The main endpoint. The manual references testing `/health` and `/analyze-ticket`, so that is the working assumption — **verify the exact path, method, fields, types, and enum spelling in the Problem Statement before trusting any of the below.**

```
FILL FROM PROBLEM STATEMENT
───────────────────────────
[ ] Exact endpoint path + method
[ ] Request JSON schema  — field names, types, required vs optional
[ ] Response JSON schema — field names, types
[ ] All enum values      — exact spelling (e.g. decision/routing/flag values)
[ ] HTTP status codes    — per success/error case
```

Until then, encode the contract as Zod schemas in [`lib/schema.ts`](lib/schema.ts) and treat the field names below as **placeholders** (rename to match the real spec):

```ts
// PLACEHOLDER — replace field names/enums with the Problem Statement's exact spec.
import { z } from "zod";

export const AnalyzeTicketRequest = z.object({
  // e.g. ticket_id, customer_message, case_data / evidence, history…
}).passthrough(); // tolerate unexpected extra input fields safely

export const Decision = z.enum([/* e.g. "approve_review","reject","escalate" */]);
export const AnalyzeTicketResponse = z.object({
  // decision, evidence (which fields were used), routing/escalation,
  // review_flags, summary, next_action, customer_reply …
});
```

### Hard contract rules (worth 15 pts + makes everything else scoreable)
- Exact **field names, types, and enum values** — match the spec byte-for-byte.
- Always return valid JSON with `application/json`. **No stray logs or text in the response body.**
- Per-request work must finish within **30 seconds** (slower = failure).
- **Unexpected/malformed/missing input → controlled error or safe fallback, never a crash or 5xx.**

---

## 3. Architecture — hybrid (deterministic shell + LLM core)

The manual explicitly recommends a hybrid rule + AI system. This is rubric-optimal: the two things we cannot get wrong — **safety** and **schema** — stay fully deterministic; the LLM lifts Evidence Reasoning (35) and Response Quality (10).

```
POST /analyze-ticket
  → Zod-validate input            (lib/schema.ts)
  → assemble evidence context     (lib/reasoning.ts)
  → LLM: reason + draft           (lib/llm.ts)        ─┐ on timeout / error / no key
  → deterministic SAFETY filter   (lib/safety.ts)      │→ deterministic fallback path
  → Zod-validate output           (lib/schema.ts)     ─┘   (rules-only decision + safe templated reply)
  → respond
```

**Deterministic layer owns** (never delegated to the model): input/output schema + enum validation, the safety filter, escalation/routing rules, and the fallback path so a slow or failed LLM call never produces a 5xx or a timeout.

**LLM layer owns:** evidence reasoning, the review-decision rationale, and drafting the summary / next action / customer reply.

**Golden rule:** every customer-facing string the service emits — LLM-drafted *or* templated — passes through `lib/safety.ts` before it leaves. No exceptions.

---

## 4. Safety guardrails — HARD REQUIREMENTS (20 pts + disqualifier risk)

Safety is a gate, not polish. Enforce these deterministically in [`lib/safety.ts`](lib/safety.ts) **and** repeat them as instructions in the LLM prompt (defense in depth).

### Penalties (from the rubric)
| Violation | Penalty |
|---|---|
| Asks for **PIN, OTP, password, or secret credentials** | **−15** |
| Performs / promises **unauthorized actions** | **−10** |
| Instructs the customer to **contact suspicious third parties** | **−10** |
| **Two or more critical violations** | **Not eligible for the top-40 finalist pool** |

### Enforceable rules
1. **NEVER request secret credentials** (PIN/OTP/password/full card/CVV). The reply *may warn the user never to share these*, but must never ask for them. → deterministic check: scan every outgoing reply for solicitation patterns; redact/replace if found.
2. **NEVER promise unauthorized or irreversible outcomes** ("your refund is approved", "I've reset your account", "guaranteed"). Recommend a review; don't promise action. → strip/own-flag any promise verbs tied to account/financial actions.
3. **Official channels only.** Never direct users to third-party / non-official contacts, links, or numbers. → reject replies containing external contact details; point to official bKash support only.
4. **Escalate uncertain or risky cases to human review** — when evidence is weak, conflicting, or the case smells like fraud/account-takeover, the decision must route to escalation, not a confident auto-resolution.
5. **Protect sensitive information** — never echo full credentials/account secrets back in the response; redact where needed.

### Implementation shape
```ts
// lib/safety.ts — runs on EVERY customer-facing string before it leaves.
export function enforceSafety(reply: string, ctx: Ctx): { reply: string; flags: string[] } {
  // 1. credential-solicitation scan (regex + keyword)  → flag + neutralize
  // 2. unauthorized-promise scan                        → flag + soften to "recommend a review"
  // 3. third-party / external-contact scan              → flag + replace with official channel
  // returns sanitized reply + any raised flags (also feed flags into escalation routing)
}
```

---

## 5. Reliability & performance (10 pts)

- **Latency targets:** p95 ≤ **5s** for full credit (partial to 15s, minimal to 30s); `/health` ready < 60s.
- **LLM call is the only slow thing** — give it a short per-request timeout (~6–8s) and **fall back to the deterministic path** on timeout/error. Never let an LLM hiccup 5xx or time out the request.
- **Stateless & graceful:** no shared mutable state between requests; controlled errors on malformed/missing fields; never crash.
- **Cost-aware + caching** (tie-breaker #5): use the fast default model; cache identical-input results where safe.
- The SDK auto-retries 429/5xx with backoff — keep `maxRetries` low (1) so worst-case wall-clock (`timeout × (retries+1)`) stays well under 30s.

---

## 6. Project structure & commands (Next.js + TypeScript → Vercel)

```
app/
  api/
    health/route.ts          # GET  → { status: "ok" }
    analyze-ticket/route.ts  # POST → validated, safe, schema-correct JSON  (⚠️ confirm route name)
lib/
  schema.ts                  # Zod request/response schemas + enums (the contract)
  reasoning.ts               # evidence assembly + decision orchestration + deterministic fallback
  safety.ts                  # deterministic safety filter + escalation rules
  llm.ts                     # swappable LLM client (default Claude Haiku 4.5)
.env.example                 # variable NAMES only — no real secrets
README.md
```

### Endpoint skeletons
```ts
// app/api/health/route.ts
export async function GET() {
  return Response.json({ status: "ok" });
}
```
```ts
// app/api/analyze-ticket/route.ts  (⚠️ rename route to match the spec)
import { AnalyzeTicketRequest, AnalyzeTicketResponse } from "@/lib/schema";

export async function POST(req: Request) {
  let body: unknown;
  try { body = await req.json(); }
  catch { return Response.json({ error: "invalid_json" }, { status: 400 }); }

  const parsed = AnalyzeTicketRequest.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });

  const result = await analyze(parsed.data);       // hybrid: reason → safety → fallback
  const out = AnalyzeTicketResponse.parse(result); // guarantee schema before responding
  return Response.json(out);                        // 200, application/json
}
```

### Commands
```bash
npm install
npm run dev          # local: test GET /health and POST /analyze-ticket from outside
npm run build
vercel --prod        # or push to a Vercel-connected GitHub repo
```

### Vercel notes
- Route handlers deploy as serverless functions with **zero config** — no port binding needed (Vercel handles ingress).
- Set secrets as **Environment Variables in the Vercel dashboard** (Production), never in the repo.
- After deploy, **test `/health` and the main endpoint from outside** (curl) before submitting — the judge calls them directly with no auth.

---

## 7. Secrets & repo hygiene

- **No real secrets in the repo — ever** (not in code, README, screenshots, Docker images, or commit history).
- `.env.example` holds **variable names + placeholder values only**:
  ```
  ANTHROPIC_API_KEY=
  MODEL_NAME=claude-haiku-4-5
  ```
- Real keys live in **Vercel env vars** (deployed endpoint) or the **private submission field** (only if a Docker/code fallback needs them for judging).
- Private repo? **Add the organizer GitHub handle(s) with read access** before the deadline; keep it reachable until results are published.
- Use **temporary, limited-quota keys** for judging; **rotate/revoke after** evaluation.

---

## 8. AI / model usage (the swappable LLM slot)

**Hybrid is the approach.** The LLM is one swappable component, defaulting to **Claude Haiku 4.5** — fast and cheap, which protects the p95 ≤ 5s budget. Swapping providers/models is a **config change, not a code change**. If no key is present or the call fails, the deterministic path answers — so the service never hard-depends on an external API during judging.

```ts
// lib/llm.ts — one thin function; provider/model from env; deterministic fallback on failure.
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();                       // reads ANTHROPIC_API_KEY
const MODEL = process.env.MODEL_NAME ?? "claude-haiku-4-5";

export async function callModel(system: string, user: string): Promise<string | null> {
  try {
    const res = await client.messages.create(
      { model: MODEL, max_tokens: 1024, system, messages: [{ role: "user", content: user }] },
      { timeout: 8000, maxRetries: 1 },              // fail fast → caller uses deterministic fallback
    );
    const text = res.content.find((b) => b.type === "text");
    return text ? text.text : null;
  } catch {
    return null;                                      // signal the fallback path; never throw to the route
  }
}
```

Notes for the coding agent:
- Package: `npm install @anthropic-ai/sdk`. Model id `claude-haiku-4-5` (200K context, fast/low-cost).
- **Do not** send `thinking`, `effort`, `temperature`, `top_p`, or `top_k` to Haiku 4.5 — keep the request minimal (`model`, `max_tokens`, `system`, `messages`).
- **Optional accuracy boost:** Haiku 4.5 supports **structured outputs** — pass `output_config: { format: { type: "json_schema", schema } }` (or `client.messages.parse()` with a Zod schema) to make the model emit structured reasoning fields directly. The deterministic Zod still validates the final HTTP response regardless.
- Document the chosen model + why in the README (tie-breaker #5 rewards cost-aware usage).

---

## 9. Testing & pre-submit checklist (gate before submitting)

- [ ] `GET /health` returns exactly `{"status":"ok"}`.
- [ ] Main endpoint accepts the sample request JSON.
- [ ] Response contains **all required fields**; **enum values match the spec exactly**.
- [ ] Handles **empty / missing optional** input safely.
- [ ] Handles **malformed / non-critical missing** fields **without crashing** (controlled error).
- [ ] Generated reply **never asks for** PIN/OTP/password/secret credentials.
- [ ] Generated reply **never promises** unauthorized/irreversible actions or guaranteed outcomes.
- [ ] Reply points only to **official channels**, never suspicious third parties.
- [ ] Endpoint (or Docker/code fallback) **responds within the 30s timeout**.
- [ ] README complete; `.env.example` present; **no real secrets committed**.
- [ ] `/health` and the main endpoint tested **from outside** the deployment.

---

## 10. Deliverables & submission

- **Deployment path priority:** (1) **working public endpoint URL + GitHub repo** ← preferred, judges call it directly; (2) lightweight Docker fallback; (3) code-only repro (last resort, reduced deploy credit). **We target (1) on Vercel.**
- **README must cover:** setup, run command, sample request, sample response, AI/model usage (hybrid + Claude Haiku 4.5 + fallback), safety logic, known limitations.
- **Submission form needs:** team name/ID, GitHub URL, submission path, public base URL, env var **names** (no values), sample request/response, AI usage explanation, safety logic explanation, known limitations, confirmation of **synthetic data only** and **no secrets committed**.
- Only ever use **synthetic data** — never real customer/financial/production data, and never integrate live-action production APIs.

---

## 11. Do-NOT list (from the manual)

- ❌ Build only a UI / screenshots — the preliminary round judges the **API**. (UI is optional and **not** judged; skip it.)
- ❌ Submit an endpoint that requires login / dashboard / private network access.
- ❌ Use real user, customer, business, financial, or production data.
- ❌ Integrate real production APIs that can trigger live actions.
- ❌ Ask users for sensitive private info / secret credentials / restricted auth details.
- ❌ Promise unauthorized approvals, irreversible actions, account changes, or guaranteed outcomes.
- ❌ Commit API keys or `.env` files.
- ❌ Rely on huge models, GPU, or multi-GB downloads.

---

## 12. Working agreement for AI coding agents

When building or editing in this repo:

1. **Schema first.** Get `/health` and the main endpoint returning spec-exact JSON before adding intelligence. Validate with Zod at both edges.
2. **Safety is non-negotiable.** Every customer-facing string passes `lib/safety.ts`. When in doubt between a confident answer and escalation, **escalate**.
3. **Deterministic-first.** Prefer rules where rules suffice; use the LLM for language understanding and reasoning support, never for validation or safety.
4. **Fail safe, never crash.** Malformed input → controlled error. LLM failure → deterministic fallback. No 5xx on valid requests.
5. **Small, focused, testable units.** Keep `schema` / `reasoning` / `safety` / `llm` independently understandable and replaceable.
6. **Don't expand scope.** No UI, no extra services, no live integrations. Match the spec; ask before adding anything the rubric doesn't reward.
7. **When the Problem Statement drops:** fill every slot in §2, re-confirm the exact endpoint name, and re-run the §9 checklist.

> A simple, reliable, safe API beats a flashy but broken one. Correct reasoning, safe behaviour, clean API implementation, reliable execution, and clear communication win.
