import type { Transaction } from "./schema";
import type { Lang } from "./types";

// Bilingual keyword sets (starter lists derived from the sample pack; extend against the harness).
export const KW = {
  credWords: { en: ["otp", "pin", "password", "card number", "cvv", "full card"], bn: ["ওটিপি", "পিন", "পাসওয়ার্ড"] },
  socialCtx: { en: ["someone", "called", "calling", "caller", "sms", "message", "claim", "from bkash", "share", "asked", "blocked", "scam", "fraud", "suspicious"], bn: ["কেউ", "ফোন", "এসএমএস", "শেয়ার", "প্রতারণা", "সন্দেহ"] },
  phishingStrong: { en: ["scam", "phishing", "fraud", "suspicious"], bn: ["প্রতারণা", "সন্দেহজনক"] },
  duplicate: { en: ["twice", "two times", "double", "duplicate", "again", "second time", "charged twice", "deducted twice"], bn: ["দুইবার", "দুবার", "ডবল"] },
  agent: { en: ["agent", "cash in", "cash-in", "cashin", "deposit"], bn: ["এজেন্ট", "ক্যাশ ইন", "ক্যাশইন", "জমা"] },
  notReceived: { en: ["not", "didn't", "did not", "haven't", "balance", "not reflected"], bn: ["আসেনি", "পাইনি", "দেখছি না"] },
  settlement: { en: ["settle", "settlement", "settled", "payout"], bn: ["সেটেলমেন্ট", "নিষ্পত্তি"] },
  failed: { en: ["failed", "failure", "unsuccessful", "not successful", "declined"], bn: ["ব্যর্থ", "হয়নি"] },
  deduct: { en: ["deduct", "deducted", "cut", "balance", "taken"], bn: ["কাটা", "কেটে", "ব্যালেন্স"] },
  wrong: { en: ["wrong number", "wrong person", "wrong account", "wrong recipient", "by mistake", "mistake", "didn't get", "didn't receive", "did not receive", "not received", "hasn't received", "haven't received", "didn't reach"], bn: ["ভুল নম্বরে", "ভুল নম্বর", "ভুল মানুষ", "ভুল করে", "পায়নি", "পাইনি", "পৌঁছায়নি"] },
  refund: { en: ["refund", "money back", "return my money", "want my money", "changed my mind", "don't want", "do not want"], bn: ["ফেরত", "রিফান্ড", "টাকা ফেরত"] },
} as const;

const BANGLA_DIGITS: Record<string, string> = { "०": "0", "१": "1", "२": "2", "३": "3", "४": "4", "५": "5", "६": "6", "७": "7", "८": "8", "९": "9" };

export function parseAmounts(text: string): number[] {
  const normalized = text.replace(/[०-९]/g, (d) => BANGLA_DIGITS[d] ?? d);
  const out: number[] = [];
  for (const m of normalized.matchAll(/\d[\d,]*/g)) {
    const n = Number(m[0].replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) out.push(n);
  }
  return out;
}

export function mentions(text: string, en: readonly string[], bn: readonly string[]): boolean {
  const lc = text.toLowerCase();
  return en.some((w) => lc.includes(w)) || bn.some((w) => text.includes(w));
}

export function detectLanguage(req: { language?: string; complaint: string }): Lang {
  if (req.language === "bn") return "bn";
  if (req.language === "en") return "en";
  return /[ঀ-৿]/.test(req.complaint) ? "bn" : "en";
}

export function priorTransferCount(history: Transaction[], counterparty: string): number {
  return history.filter((t) => t.type === "transfer" && t.counterparty === counterparty).length;
}

export function findDuplicate(history: Transaction[]): Transaction | null {
  const WINDOW_MS = 2 * 60 * 1000;
  for (let i = 0; i < history.length; i++) {
    for (let j = i + 1; j < history.length; j++) {
      const a = history[i], b = history[j];
      if (a.amount !== b.amount || a.counterparty !== b.counterparty || a.type !== b.type) continue;
      if (a.status !== "completed" || b.status !== "completed") continue;
      const dt = Math.abs(Date.parse(a.timestamp) - Date.parse(b.timestamp));
      if (Number.isFinite(dt) && dt <= WINDOW_MS) {
        return Date.parse(a.timestamp) >= Date.parse(b.timestamp) ? a : b;
      }
    }
  }
  return null;
}
