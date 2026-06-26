import { AnalyzeRequestSchema, AnalyzeResponseSchema } from "@/lib/schema";
import { analyze } from "@/lib/analyze";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_request" }, { status: 400 });

  if (parsed.data.complaint.trim().length === 0) {
    return Response.json({ error: "unprocessable", detail: "complaint must not be empty" }, { status: 422 });
  }

  try {
    const result = await analyze(parsed.data);
    const out = AnalyzeResponseSchema.parse(result);
    return Response.json(out, { status: 200 });
  } catch {
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}