import type { AnalyzeRequest, CaseType, EvidenceVerdict } from "./schema";
import { parseAmounts, findDuplicate, priorTransferCount } from "./extract";

export interface MatchResult {
  relevant_transaction_id: string | null;
  evidence_verdict: EvidenceVerdict;
  signals: string[];
}

export function matchEvidence(req: AnalyzeRequest, caseType: CaseType): MatchResult {
  const history = req.transaction_history ?? [];
  if (history.length === 0) {
    return { relevant_transaction_id: null, evidence_verdict: "insufficient_data", signals: ["needs_clarification"] };
  }

  if (caseType === "duplicate_payment") {
    const dup = findDuplicate(history);
    if (dup) return { relevant_transaction_id: dup.transaction_id, evidence_verdict: "consistent", signals: ["duplicate_detected"] };
  }

  const amounts = new Set(parseAmounts(req.complaint));
  const candidates = history.filter((t) => amounts.has(t.amount));

  if (candidates.length === 0) {
    return { relevant_transaction_id: null, evidence_verdict: "insufficient_data", signals: ["needs_clarification"] };
  }
  if (candidates.length > 1) {
    return { relevant_transaction_id: null, evidence_verdict: "insufficient_data", signals: ["ambiguous_match", "needs_clarification"] };
  }

  const txn = candidates[0];
  if (caseType === "wrong_transfer" && priorTransferCount(history, txn.counterparty) >= 2) {
    return { relevant_transaction_id: txn.transaction_id, evidence_verdict: "inconsistent", signals: ["established_recipient_pattern", "evidence_inconsistent"] };
  }
  return { relevant_transaction_id: txn.transaction_id, evidence_verdict: "consistent", signals: ["transaction_match"] };
}
