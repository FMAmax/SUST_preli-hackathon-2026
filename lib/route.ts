import type { CaseType, Department, EvidenceVerdict, Severity, UserType } from "./schema";

const DEPT: Record<CaseType, Department> = {
  wrong_transfer: "dispute_resolution",
  payment_failed: "payments_ops",
  duplicate_payment: "payments_ops",
  refund_request: "customer_support",
  merchant_settlement_delay: "merchant_operations",
  agent_cash_in_issue: "agent_operations",
  phishing_or_social_engineering: "fraud_risk",
  other: "customer_support",
};

const DISPUTE_TYPES: CaseType[] = ["wrong_transfer", "duplicate_payment", "agent_cash_in_issue"];

function severityFor(caseType: CaseType, verdict: EvidenceVerdict): Severity {
  if (caseType === "phishing_or_social_engineering") return "critical";
  if (caseType === "payment_failed" || caseType === "duplicate_payment" || caseType === "agent_cash_in_issue") return "high";
  if (caseType === "wrong_transfer") return verdict === "consistent" ? "high" : "medium";
  if (caseType === "merchant_settlement_delay") return "medium";
  return "low";
}

function humanReview(caseType: CaseType, verdict: EvidenceVerdict): boolean {
  if (caseType === "phishing_or_social_engineering") return true;
  if (verdict === "insufficient_data") return false;
  if (verdict === "inconsistent") return true;
  return DISPUTE_TYPES.includes(caseType);
}

function confidenceFor(caseType: CaseType, verdict: EvidenceVerdict): number {
  if (caseType === "phishing_or_social_engineering") return 0.95;
  if (verdict === "consistent") return 0.9;
  if (verdict === "inconsistent") return 0.75;
  return 0.6;
}

export function route(input: { caseType: CaseType; verdict: EvidenceVerdict; userType?: UserType; signals: string[] }) {
  const { caseType, verdict, signals } = input;
  const department: Department = caseType === "refund_request" && verdict === "inconsistent" ? "dispute_resolution" : DEPT[caseType];
  const reason_codes = [...new Set([caseType, ...signals])];
  return {
    department,
    severity: severityFor(caseType, verdict),
    human_review_required: humanReview(caseType, verdict),
    reason_codes,
    confidence: confidenceFor(caseType, verdict),
  };
}
