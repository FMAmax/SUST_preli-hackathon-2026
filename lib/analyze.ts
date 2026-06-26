import type { AnalyzeRequest, AnalyzeResponse, Transaction } from "./schema";
import type { Facts, Prose } from "./types";
import { detectLanguage } from "./extract";
import { classifyCaseType } from "./classify";
import { matchEvidence } from "./match";
import { route } from "./route";
import { buildReply } from "./reply";
import { improveProse } from "./llm";
import { assessSafety } from "./safety";

function safeFallback(ticket_id: string): AnalyzeResponse {
  return {
    ticket_id,
    relevant_transaction_id: null,
    evidence_verdict: "insufficient_data",
    case_type: "other",
    severity: "low",
    department: "customer_support",
    agent_summary: "The case could not be fully processed; routing to support for manual handling.",
    recommended_next_action: "Have a support agent review this ticket manually and request any missing details.",
    customer_reply: "Thank you for reaching out. Our support team will review your request and respond through official channels. Please do not share your PIN or OTP with anyone.",
    human_review_required: true,
    confidence: 0.3,
    reason_codes: ["fallback"],
  };
}


export async function analyze(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  try {
    const language = detectLanguage(req);
    const case_type = classifyCaseType(req);
    const m = matchEvidence(req, case_type);
    const history = req.transaction_history ?? [];
    const relevant_transaction: Transaction | null = m.relevant_transaction_id ? history.find((t) => t.transaction_id === m.relevant_transaction_id) ?? null : null;
    const r = route({ caseType: case_type, verdict: m.evidence_verdict, userType: req.user_type, signals: m.signals });

    const facts: Facts = {
      ticket_id: req.ticket_id,
      language,
      case_type,
      evidence_verdict: m.evidence_verdict,
      relevant_transaction,
      relevant_transaction_id: m.relevant_transaction_id,
      department: r.department,
      severity: r.severity,
      human_review_required: r.human_review_required,
      reason_codes: r.reason_codes,
      confidence: r.confidence,
    };

    const draft: Prose = buildReply(facts);
    let prose: Prose = draft;
    const improved = await improveProse(facts, draft);
    if (improved && assessSafety(improved).length === 0) prose = improved;
    if (assessSafety(prose).length !== 0) prose = draft; // belt: never ship a flagged string

    return {
      ticket_id: req.ticket_id,
      relevant_transaction_id: facts.relevant_transaction_id,
      evidence_verdict: facts.evidence_verdict,
      case_type: facts.case_type,
      severity: facts.severity,
      department: facts.department,
      agent_summary: prose.agent_summary,
      recommended_next_action: prose.recommended_next_action,
      customer_reply: prose.customer_reply,
      human_review_required: facts.human_review_required,
      confidence: facts.confidence,
      reason_codes: facts.reason_codes,
    };
  } catch {
    return safeFallback(req?.ticket_id ?? "unknown");
  }
}
