import { describe, it, expect } from "vitest";
import { GET } from "@/app/health/route";

describe("GET /health", () => {
  it("returns exactly {status:'ok'} with 200", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
