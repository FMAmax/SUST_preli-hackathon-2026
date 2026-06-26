import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/analyze-ticket/route";

const post = (body: string) => POST(new Request("http://localhost/analyze-ticket", { method: "POST", body, headers: { "content-type": "application/json" } }));

describe("POST /analyze-ticket", () => {
  beforeEach(() => { delete process.env.GEMINI_API_KEY; });

  it("400 on invalid JSON", async () => { expect((await post("not json")).status).toBe(400); });
  it("400 on missing required field", async () => { expect((await post(JSON.stringify({ complaint: "hi" }))).status).toBe(400); });
  it("422 on empty complaint", async () => { expect((await post(JSON.stringify({ ticket_id: "T", complaint: "   " }))).status).toBe(422); });
  it("200 with schema-valid body on a good request", async () => {
    const res = await post(JSON.stringify({ ticket_id: "TKT-1", complaint: "I sent 5000 to a wrong number", transaction_history: [{ transaction_id: "TXN-9", timestamp: "2026-04-14T14:08:22Z", type: "transfer", amount: 5000, counterparty: "+8801719876543", status: "completed" }] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ticket_id).toBe("TKT-1");
    expect(body.case_type).toBe("wrong_transfer");
  });
});