import { describe, it, expect, beforeEach } from "vitest";
import { analyze } from "@/lib/analyze";
import { assessSafety } from "@/lib/safety";
import samples from "@/SUST_Preli_Sample_Cases.json";

const RANK = { low: 0, medium: 1, high: 2, critical: 3 } as const;

describe("sample pack functional equivalence", () => {
  beforeEach(() => { delete process.env.GEMINI_API_KEY; });

  for (const c of (samples as any).cases) {
    it(`${c.id}: ${c.label}`, async () => {
      const out: any = await analyze(c.input);
      const exp = c.expected_output;
      expect(out.relevant_transaction_id).toBe(exp.relevant_transaction_id);
      expect(out.evidence_verdict).toBe(exp.evidence_verdict);
      expect(out.case_type).toBe(exp.case_type);
      expect(out.department).toBe(exp.department);
      expect(Math.abs(RANK[out.severity] - RANK[exp.severity])).toBeLessThanOrEqual(1);
      expect(assessSafety({ agent_summary: out.agent_summary, recommended_next_action: out.recommended_next_action, customer_reply: out.customer_reply })).toEqual([]);
    });
  }
});