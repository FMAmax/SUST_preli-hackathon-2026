import { z } from "zod";

export const LANGUAGES = ["en", "bn", "mixed"] as const;
export const CHANNELS = ["in_app_chat", "call_center", "email", "merchant_portal", "field_agent"] as const;
export const USER_TYPES = ["customer", "merchant", "agent", "unknown"] as const;
export const TXN_TYPES = ["transfer", "payment", "cash_in", "cash_out", "settlement", "refund"] as const;
export const TXN_STATUSES = ["completed", "failed", "pending", "reversed"] as const;
export const EVIDENCE_VERDICTS = ["consistent", "inconsistent", "insufficient_data"] as const;
export const CASE_TYPES = [
  "wrong_transfer", "payment_failed", "refund_request", "duplicate_payment",
  "merchant_settlement_delay", "agent_cash_in_issue", "phishing_or_social_engineering", "other",
] as const;
export const SEVERITIES = ["low", "medium", "high", "critical"] as const;
export const DEPARTMENTS = [
  "customer_support", "dispute_resolution", "payments_ops",
  "merchant_operations", "agent_operations", "fraud_risk",
] as const;

export type CaseType = (typeof CASE_TYPES)[number];
export type Department = (typeof DEPARTMENTS)[number];
export type Severity = (typeof SEVERITIES)[number];
export type EvidenceVerdict = (typeof EVIDENCE_VERDICTS)[number];
export type UserType = (typeof USER_TYPES)[number];

export const TransactionSchema = z.object({
  transaction_id: z.string(),
  timestamp: z.string(),
  type: z.enum(TXN_TYPES),
  amount: z.number(),
  counterparty: z.string(),
  status: z.enum(TXN_STATUSES),
});
export type Transaction = z.infer<typeof TransactionSchema>;

export const AnalyzeRequestSchema = z
  .object({
    ticket_id: z.string().min(1),
    complaint: z.string(),
    language: z.enum(LANGUAGES).optional(),
    channel: z.enum(CHANNELS).optional(),
    user_type: z.enum(USER_TYPES).optional(),
    campaign_context: z.string().optional(),
    transaction_history: z.array(TransactionSchema).optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .passthrough();
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const AnalyzeResponseSchema = z.object({
  ticket_id: z.string(),
  relevant_transaction_id: z.string().nullable(),
  evidence_verdict: z.enum(EVIDENCE_VERDICTS),
  case_type: z.enum(CASE_TYPES),
  severity: z.enum(SEVERITIES),
  department: z.enum(DEPARTMENTS),
  agent_summary: z.string(),
  recommended_next_action: z.string(),
  customer_reply: z.string(),
  human_review_required: z.boolean(),
  confidence: z.number().min(0).max(1).optional(),
  reason_codes: z.array(z.string()).optional(),
});
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
