import type { AnalyzeRequest, CaseType, Transaction } from "./schema";
import { KW, mentions, findDuplicate } from "./extract";

const hasStatus = (h: Transaction[], s: Transaction["status"]) => h.some((t) => t.status === s);
const hasType = (h: Transaction[], t: Transaction["type"]) => h.some((x) => x.type === t);

function isPhishing(c: string): boolean {
  const cred = mentions(c, KW.credWords.en, KW.credWords.bn);
  const ctx = mentions(c, KW.socialCtx.en, KW.socialCtx.bn);
  return (cred && ctx) || mentions(c, KW.phishingStrong.en, KW.phishingStrong.bn);
}

export function classifyCaseType(req: AnalyzeRequest): CaseType {
  const c = req.complaint;
  const h = req.transaction_history ?? [];

  if (isPhishing(c)) return "phishing_or_social_engineering";
  if (mentions(c, KW.duplicate.en, KW.duplicate.bn) || findDuplicate(h)) return "duplicate_payment";
  if (mentions(c, KW.agent.en, KW.agent.bn) && (hasType(h, "cash_in") || mentions(c, KW.notReceived.en, KW.notReceived.bn))) return "agent_cash_in_issue";
  if (mentions(c, KW.settlement.en, KW.settlement.bn) && (req.user_type === "merchant" || hasType(h, "settlement"))) return "merchant_settlement_delay";
  if (mentions(c, KW.failed.en, KW.failed.bn) && (mentions(c, KW.deduct.en, KW.deduct.bn) || hasStatus(h, "failed"))) return "payment_failed";
  if (mentions(c, KW.wrong.en, KW.wrong.bn) && (hasType(h, "transfer") || mentions(c, KW.notReceived.en, KW.notReceived.bn))) return "wrong_transfer";
  if (mentions(c, KW.refund.en, KW.refund.bn)) return "refund_request";
  return "other";
}
