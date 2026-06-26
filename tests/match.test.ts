import { describe, it, expect } from "vitest";
import { matchEvidence } from "@/lib/match";
import type { Transaction } from "@/lib/schema";

const tx = (o: Partial<Transaction>): Transaction => ({
  transaction_id: "X", timestamp: "2026-04-14T10:00:00Z", type: "transfer",
  amount: 0, counterparty: "C", status: "completed", ...o,
});
const reqWith = (complaint: string, h: Transaction[]) => ({ ticket_id: "T", complaint, transaction_history: h });

describe("matchEvidence", () => {
  it("consistent single match", () => {
    const r = matchEvidence(reqWith("sent 5000 to wrong number", [tx({ transaction_id: "A", amount: 5000, counterparty: "P1" })]), "wrong_transfer");
    expect(r).toMatchObject({ relevant_transaction_id: "A", evidence_verdict: "consistent" });
  });
  it("inconsistent via established recipient", () => {
    const h = [
      tx({ transaction_id: "A", amount: 2000, counterparty: "P" }),
      tx({ transaction_id: "B", amount: 2500, counterparty: "P" }),
      tx({ transaction_id: "C", amount: 1500, counterparty: "P" }),
    ];
    const r = matchEvidence(reqWith("sent 2000 to wrong person", h), "wrong_transfer");
    expect(r).toMatchObject({ relevant_transaction_id: "A", evidence_verdict: "inconsistent" });
  });
  it("insufficient when history empty", () => {
    expect(matchEvidence(reqWith("someone asked my OTP", []), "phishing_or_social_engineering").evidence_verdict).toBe("insufficient_data");
  });
  it("insufficient when ambiguous (multiple same-amount)", () => {
    const h = [tx({ transaction_id: "A", amount: 1000, counterparty: "P1" }), tx({ transaction_id: "B", amount: 1000, counterparty: "P2" }), tx({ transaction_id: "C", amount: 1000, counterparty: "P1", status: "failed" })];
    const r = matchEvidence(reqWith("sent 1000 to my brother", h), "wrong_transfer");
    expect(r).toMatchObject({ relevant_transaction_id: null, evidence_verdict: "insufficient_data" });
  });
  it("duplicate -> later txn, consistent", () => {
    const h = [tx({ transaction_id: "A", type: "payment", amount: 850, counterparty: "BILLER", timestamp: "2026-04-14T08:15:30Z" }), tx({ transaction_id: "B", type: "payment", amount: 850, counterparty: "BILLER", timestamp: "2026-04-14T08:15:42Z" })];
    expect(matchEvidence(reqWith("charged twice 850", h), "duplicate_payment")).toMatchObject({ relevant_transaction_id: "B", evidence_verdict: "consistent" });
  });
});
