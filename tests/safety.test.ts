import { describe, it, expect } from "vitest";
import { assessSafety } from "@/lib/safety";
import type { Prose } from "@/lib/types";

const prose = (o: Partial<Prose>): Prose => ({ agent_summary: "s", recommended_next_action: "n", customer_reply: "c", ...o });

describe("assessSafety", () => {
  it("passes a safe reply that warns about PIN/OTP", () => {
    expect(assessSafety(prose({ customer_reply: "Please do not share your PIN or OTP with anyone." }))).toEqual([]);
  });
  it("flags asking for OTP", () => {
    expect(assessSafety(prose({ customer_reply: "Please share your OTP to verify your account." }))).toContain("credential_solicitation");
  });
  it("flags an unauthorized refund promise in either field", () => {
    expect(assessSafety(prose({ customer_reply: "We will refund you now." }))).toContain("unauthorized_promise");
    expect(assessSafety(prose({ recommended_next_action: "Refund the customer 500 immediately." }))).toContain("unauthorized_promise");
  });
  it("allows the safe official-channel phrasing", () => {
    expect(assessSafety(prose({ customer_reply: "Any eligible amount will be returned through official channels." }))).toEqual([]);
  });
  it("flags external contact details", () => {
    expect(assessSafety(prose({ customer_reply: "Call +8801999888777 or visit http://bkash-help.tk" }))).toContain("third_party_redirect");
  });
});
