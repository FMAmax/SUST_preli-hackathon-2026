import type { CaseType, Department, EvidenceVerdict, Severity, Transaction } from "./schema";

export type Lang = "en" | "bn";

export interface Facts {
  ticket_id: string;
  language: Lang;
  case_type: CaseType;
  evidence_verdict: EvidenceVerdict;
  relevant_transaction: Transaction | null;
  relevant_transaction_id: string | null;
  department: Department;
  severity: Severity;
  human_review_required: boolean;
  reason_codes: string[];
  confidence: number;
}

export interface Prose {
  agent_summary: string;
  recommended_next_action: string;
  customer_reply: string;
}
