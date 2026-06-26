import { describe, it, expect } from "vitest";
import { parseAmounts, detectLanguage, findDuplicate, priorTransferCount } from "@/lib/extract";
import type { Transaction } from "@/lib/schema";

const tx = (o: Partial<Transaction>): Transaction => ({
  transaction_id: "X", timestamp: "2026-04-14T10:00:00Z", type: "payment",
  amount: 0, counterparty: "C", status: "completed", ...o,
});

describe("extract", () => {
  it("parses Latin and Bangla amounts", () => {
    expect(parseAmounts("I sent 5,000 taka")).toContain(5000);
    expect(parseAmounts("আমি ২০০০ টাকা পাঠিয়েছি")).toContain(2000);
  });
  it("detects language from field and from Bangla script", () => {
    expect(detectLanguage({ language: "bn", complaint: "x" })).toBe("bn");
    expect(detectLanguage({ complaint: "আমার টাকা" })).toBe("bn");
    expect(detectLanguage({ complaint: "my money" })).toBe("en");
  });
  it("finds a duplicate pair and returns the later txn", () => {
    const h = [
      tx({ transaction_id: "A", amount: 850, counterparty: "BILLER", timestamp: "2026-04-14T08:15:30Z" }),
      tx({ transaction_id: "B", amount: 850, counterparty: "BILLER", timestamp: "2026-04-14T08:15:42Z" }),
    ];
    expect(findDuplicate(h)?.transaction_id).toBe("B");
  });
  it("counts prior transfers to the same counterparty", () => {
    const h = [
      tx({ type: "transfer", counterparty: "P" }),
      tx({ type: "transfer", counterparty: "P" }),
      tx({ type: "transfer", counterparty: "Q" }),
    ];
    expect(priorTransferCount(h, "P")).toBe(2);
  });
});
