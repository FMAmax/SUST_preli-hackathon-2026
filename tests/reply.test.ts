import { describe, it, expect } from "vitest";
import { buildReply } from "@/lib/reply";
import { assessSafety } from "@/lib/safety";
import type { Facts } from "@/lib/types";
import type { Transaction } from "@/lib/schema";

const tx = (o: Partial<Transaction>): Transaction => ({
  transaction_id: "TXN-1", timestamp: "2026-04-14T10:00:00Z", type: "transfer",
  amount: 5000, counterparty: "P", status: "completed", ...o,
});
const facts = (o: Partial<Facts>): Facts => ({
  ticket_id: "T", language: "en", case_type: "wrong_transfer", evidence_verdict: "consistent",
  relevant_transaction: tx({}), relevant_transaction_id: "TXN-1", department: "dispute_resolution",
  severity: "high", human_review_required: true, reason_codes: [], confidence: 0.9, ...o,
});

describe("buildReply", () => {
  it("every case_type yields a safe reply", () => {
    for (const ct of ["wrong_transfer", "payment_failed", "refund_request", "duplicate_payment", "merchant_settlement_delay", "agent_cash_in_issue", "phishing_or_social_engineering", "other"] as const) {
      const verdict = ct === "phishing_or_social_engineering" || ct === "other" ? "insufficient_data" : "consistent";
      expect(assessSafety(buildReply(facts({ case_type: ct, evidence_verdict: verdict })))).toEqual([]);
    }
  });
  it("returns a Bangla customer_reply when language is bn, English summary always", () => {
    const r = buildReply(facts({ language: "bn", case_type: "agent_cash_in_issue", department: "agent_operations" }));
    expect(/[ঀ-৿]/.test(r.customer_reply)).toBe(true);
    expect(/[ঀ-৿]/.test(r.agent_summary)).toBe(false);
  });
  it("references the transaction id in the reply", () => {
    expect(buildReply(facts({ relevant_transaction_id: "TXN-9101" })).customer_reply).toContain("TXN-9101");
  });
  it("insufficient_data yields a clarification reply", () => {
    expect(buildReply(facts({ case_type: "other", evidence_verdict: "insufficient_data", relevant_transaction: null, relevant_transaction_id: null })).customer_reply.toLowerCase()).toContain("transaction id");
  });
});
