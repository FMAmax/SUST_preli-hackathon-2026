import type { Prose } from "./types";

const CRED = /(pin|otp|password|card number|cvv|full card)/i;
const WARNING = /(do not share|don'?t share|never share|do not give|never ask|won'?t ask|will never ask|do not disclose|never disclose)/i;
const SOLICIT = /(share|provide|send|enter|give|tell|confirm|type|input|what'?s your|what is your|need your|send us your|send me your)\s+(your\s+|the\s+)?(pin|otp|password|card number|cvv)/i;
const PROMISE = /(we will refund|i will refund|you will be refunded|refund (has been )?approved|we have refunded|i'?ve reversed|we have reversed|we will reverse|account (has been|is) unblocked|we have unblocked|guaranteed|refund the customer|reverse the (payment|transaction) (now|immediately))/i;
const URL = /(https?:\/\/|www\.)/i;
const PHONE = /\+?\d[\d\s-]{8,}\d/;
const HANDLE = /@[a-z0-9_]{2,}/i;

function violationsIn(text: string, checks: ("cred" | "promise" | "third")[]): string[] {
  const out: string[] = [];
  if (checks.includes("cred") && CRED.test(text) && SOLICIT.test(text) && !WARNING.test(text)) out.push("credential_solicitation");
  if (checks.includes("promise") && PROMISE.test(text)) out.push("unauthorized_promise");
  if (checks.includes("third") && (URL.test(text) || PHONE.test(text) || HANDLE.test(text))) out.push("third_party_redirect");
  return out;
}

export function assessSafety(p: Prose): string[] {
  const flags = new Set<string>();
  for (const f of violationsIn(p.customer_reply, ["cred", "promise", "third"])) flags.add(f);
  for (const f of violationsIn(p.recommended_next_action, ["promise"])) flags.add(f);
  return [...flags];
}
