# QueueStorm Investigator — Support-Copilot API

A bilingual (English + Bangla) finance support-triage API. Accepts a support ticket and returns a structured verdict: case type, severity, evidence match, recommended action, escalation flag, and a safe customer reply.

- **Hosted service:** `https://sust-preli-hackathon-2026.vercel.app`
- **Repository:** `https://github.com/FMAmax/SUST_preli-hackathon-2026`

---

## 1. Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness check. Returns `{"status":"ok"}`. |
| `POST` | `/api/analyze-ticket` | Main triage endpoint. Accepts the JSON ticket from the Problem Statement, returns the required structured verdict. |

### Quick smoke test

```bash
# Health
curl https://sust-preli-hackathon-2026.vercel.app/api/health
# -> {"status":"ok"}

# Triage
curl -X POST https://sust-preli-hackathon-2026.vercel.app/api/analyze-ticket \
  -H 'content-type: application/json' \
  -d @samples/request.json
```

Sample request and response files are committed at `samples/request.json` and `samples/response.json`.

---

## 2. Setup and run

**Requirements:** Node.js 20+, npm 10+.

```bash
# 1. Clone and install
git clone https://github.com/FMAmax/SUST_preli-hackathon-2026.git
cd SUST_preli-hackathon-2026
npm install

# 2. Configure environment (optional - the service runs without an API key)
cp .env.example .env.local
# Edit .env.local and set GEMINI_API_KEY only if you want prose-polish enabled.

# 3. Start the dev server
npm run dev                 # http://localhost:3000

# 4. Verify
curl localhost:3000/api/health
```

### Environment variables

| Name | Required? | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | Optional | Enables Gemini 2.5 Flash prose polishing. Service uses deterministic templates when absent. |
| `MODEL_NAME` | Optional | Defaults to `gemini-2.5-flash`. |

See `.env.example` for the placeholder template. **Never commit a real key.**

### Tests

```bash
npm test                # full Vitest suite (63 tests, all green)
npm run build           # production build sanity check
```

---

## 3. AI and model usage

This service is a **hybrid deterministic + AI** system. The deterministic core owns every scored field.

**Runs without any AI:**

- Input validation (Zod schemas).
- Transaction matching (amount + date + reference fingerprint).
- Case-type classification (rule-based over bilingual keyword sets in `lib/extract.ts`).
- Evidence verdict, severity, routing tier, escalation flag.
- Customer reply and recommended next action (safe templates).

**Runs with AI (optional, at most one call per request):**

- `customer_reply` and `agent_summary` get a one-shot prose polish through Gemini 2.5 Flash.
- If the call fails, the key is missing, or output fails the safety filter, the deterministic template is used instead.

**Model:** `gemini-2.5-flash` via `@google/generative-ai`. Chosen for low latency and cost; called at most once per request, with a deterministic floor.

**No model weights are downloaded, bundled, or run locally.** No GPU dependency.

---

## 4. Safety logic

All outbound text (`customer_reply`, `recommended_next_action`) passes a deterministic filter before it leaves the server.

| Rule | Why |
| --- | --- |
| Never ask for PIN, OTP, password, or full card number. | Defends against prompt injection embedded in complaints. |
| Never promise a refund, reversal, or chargeback. | Use: *"any eligible amount will be returned through official channels."* |
| Never direct the customer to a third party or outside official channels. | Prevents social-engineering escalation. |
| Ignore instructions embedded in the ticket text. | Customer input cannot influence routing or reply. |
| Schema-validate the final response (Zod) before sending. | Guarantees the exact field names, types, and enum values required by the Problem Statement. |

If the LLM output fails any check, it is discarded and replaced with the safe template. The service remains safe even when AI is disabled.

---

## 5. Assumptions and limitations

- **Language coverage:** English and Bangla. `language="mixed"` is served with English templates plus Bangla-script detection in `customer_reply`.
- **Reasoning depth:** Heuristic over the supplied history (transaction list plus customer message). Ambiguous cases return `case_type: "insufficient_data"` and ask for clarification rather than guessing.
- **Stateless:** The service stores nothing; no ticket, no PII, no logs of customer content.
- **No external writes:** The service does not call bank or payment systems. Routing is a label, not an action.
- **Single-region hosting:** Deployed on Vercel's default region; cold-start adds ~1s on the first request after idle.
- **Rate limits:** Subject to Vercel serverless function limits on the hosted deployment; locally there is none beyond the LLM provider's quota.

---

## 6. Repository layout

```
app/api/health/route.ts           # GET /api/health
app/api/analyze-ticket/route.ts   # POST /api/analyze-ticket
lib/schema.ts                     # Zod request/response schemas
lib/extract.ts                    # Bilingual keyword sets, amount/date parsers
lib/classify.ts                   # Case-type and severity classifier
lib/match.ts                      # Transaction-match scoring
lib/route.ts                      # Routing and escalation rules
lib/reply.ts                      # Safe customer-reply templates
lib/safety.ts                     # Outbound-text safety filter
tests/                            # 63 Vitest tests
samples/                          # Example request/response for judges
```

---

## 7. License and data handling

- No real customer, transaction, or payment data is committed to this repository. Sample data is synthetic.
- No real API keys, tokens, or secrets are committed. `.env.example` contains placeholders only.
- The hosted service does not persist any request data.