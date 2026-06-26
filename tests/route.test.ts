import { describe, it, expect } from "vitest";
import { route } from "@/lib/route";

describe("route", () => {
  it("maps department by case_type", () => {
    expect(route({ caseType: "wrong_transfer", verdict: "consistent", signals: [] }).department).toBe("dispute_resolution");
    expect(route({ caseType: "phishing_or_social_engineering", verdict: "insufficient_data", signals: [] }).department).toBe("fraud_risk");
    expect(route({ caseType: "refund_request", verdict: "inconsistent", signals: [] }).department).toBe("dispute_resolution");
  });
  it("severity reflects case_type and verdict", () => {
    expect(route({ caseType: "phishing_or_social_engineering", verdict: "insufficient_data", signals: [] }).severity).toBe("critical");
    expect(route({ caseType: "wrong_transfer", verdict: "consistent", signals: [] }).severity).toBe("high");
    expect(route({ caseType: "wrong_transfer", verdict: "inconsistent", signals: [] }).severity).toBe("medium");
    expect(route({ caseType: "refund_request", verdict: "consistent", signals: [] }).severity).toBe("low");
  });
  it("human_review precedence: insufficient_data is false unless phishing", () => {
    expect(route({ caseType: "phishing_or_social_engineering", verdict: "insufficient_data", signals: [] }).human_review_required).toBe(true);
    expect(route({ caseType: "wrong_transfer", verdict: "insufficient_data", signals: [] }).human_review_required).toBe(false); // SAMPLE-08
    expect(route({ caseType: "wrong_transfer", verdict: "inconsistent", signals: [] }).human_review_required).toBe(true);   // SAMPLE-02
    expect(route({ caseType: "payment_failed", verdict: "consistent", signals: [] }).human_review_required).toBe(false);   // SAMPLE-03
    expect(route({ caseType: "duplicate_payment", verdict: "consistent", signals: [] }).human_review_required).toBe(true); // SAMPLE-10
  });
  it("reason_codes lead with case_type and include signals", () => {
    expect(route({ caseType: "wrong_transfer", verdict: "consistent", signals: ["transaction_match"] }).reason_codes).toEqual(["wrong_transfer", "transaction_match"]);
  });
});
