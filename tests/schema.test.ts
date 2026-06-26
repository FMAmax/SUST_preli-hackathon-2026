import { describe, it, expect } from "vitest";
import { AnalyzeRequestSchema, AnalyzeResponseSchema, CASE_TYPES } from "@/lib/schema";

describe("schema", () => {
  it("accepts a minimal valid request", () => {
    const r = AnalyzeRequestSchema.safeParse({ ticket_id: "T1", complaint: "hi" });
    expect(r.success).toBe(true);
  });
  it("rejects a request missing required fields", () => {
    const r = AnalyzeRequestSchema.safeParse({ complaint: "hi" });
    expect(r.success).toBe(false);
  });
  it("allows empty complaint at schema level (semantic check handles 422)", () => {
    const r = AnalyzeRequestSchema.safeParse({ ticket_id: "T1", complaint: "" });
    expect(r.success).toBe(true);
  });
  it("validates a well-formed response and rejects a bad enum", () => {
    const base = {
      ticket_id: "T1", relevant_transaction_id: null, evidence_verdict: "consistent",
      case_type: "other", severity: "low", department: "customer_support",
      agent_summary: "s", recommended_next_action: "n", customer_reply: "c",
      human_review_required: false,
    };
    expect(AnalyzeResponseSchema.safeParse(base).success).toBe(true);
    expect(AnalyzeResponseSchema.safeParse({ ...base, case_type: "Wrong_Transfer" }).success).toBe(false);
  });
  it("exposes all 8 case types", () => {
    expect(CASE_TYPES).toHaveLength(8);
  });
});
