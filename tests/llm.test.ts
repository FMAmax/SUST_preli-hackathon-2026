import { describe, it, expect, beforeEach } from "vitest";
import { improveProse } from "@/lib/llm";
import type { Facts, Prose } from "@/lib/types";

const draft: Prose = { agent_summary: "s", recommended_next_action: "n", customer_reply: "c" };
const facts = { ticket_id: "T", language: "en", case_type: "other", evidence_verdict: "insufficient_data", relevant_transaction: null, relevant_transaction_id: null, department: "customer_support", severity: "low", human_review_required: false, reason_codes: [], confidence: 0.6 } as Facts;

describe("improveProse", () => {
  beforeEach(() => { delete process.env.GEMINI_API_KEY; });
  it("returns null when no API key is configured (deterministic fallback)", async () => {
    expect(await improveProse(facts, draft)).toBeNull();
  });
});
