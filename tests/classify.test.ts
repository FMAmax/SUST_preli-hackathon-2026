import { describe, it, expect } from "vitest";
import { classifyCaseType } from "@/lib/classify";
import type { AnalyzeRequest, Transaction } from "@/lib/schema";

const tx = (o: Partial<Transaction>): Transaction => ({
  transaction_id: "X", timestamp: "2026-04-14T10:00:00Z", type: "payment",
  amount: 0, counterparty: "C", status: "completed", ...o,
});
const req = (o: Partial<AnalyzeRequest>): AnalyzeRequest => ({ ticket_id: "T", complaint: "", ...o });

describe("classifyCaseType", () => {
  it("phishing wins first", () => {
    expect(classifyCaseType(req({ complaint: "Someone called me from bKash and asked for my OTP" }))).toBe("phishing_or_social_engineering");
  });
  it("payment_failed beats refund when a failure is described", () => {
    expect(classifyCaseType(req({ complaint: "payment failed but balance was deducted, please refund" }))).toBe("payment_failed");
  });
  it("refund_request only when no failure signal", () => {
    expect(classifyCaseType(req({ complaint: "I changed my mind, please refund my 500" }))).toBe("refund_request");
  });
  it("duplicate via keyword", () => {
    expect(classifyCaseType(req({ complaint: "I was charged twice for my bill" }))).toBe("duplicate_payment");
  });
  it("agent cash-in (Bangla)", () => {
    expect(classifyCaseType(req({ complaint: "এজেন্টের কাছে ২০০০ টাকা ক্যাশ ইন করেছি কিন্তু ব্যালেন্সে আসেনি" }))).toBe("agent_cash_in_issue");
  });
  it("wrong_transfer on 'didn't get it'", () => {
    expect(classifyCaseType(req({ complaint: "I sent 1000 to my brother but he didn't get it", transaction_history: [tx({ type: "transfer", amount: 1000 })] }))).toBe("wrong_transfer");
  });
  it("vague -> other (not wrong_transfer)", () => {
    expect(classifyCaseType(req({ complaint: "Something is wrong with my money. Please check." }))).toBe("other");
  });
  it("merchant settlement delay", () => {
    expect(classifyCaseType(req({ complaint: "My settlement of 15000 has not been received", user_type: "merchant", transaction_history: [tx({ type: "settlement", amount: 15000 })] }))).toBe("merchant_settlement_delay");
  });
  it("wrong_transfer on Bangla 'ভুলে পাঠিয়েছি' + transfer history", () => {
    expect(classifyCaseType(req({
      complaint: "আমি ভুলে ৫০০০ টাকা পাঠিয়েছি ভুল নম্বরে, এখন ফেরত চাই",
      transaction_history: [tx({ type: "transfer", amount: 5000 })],
    }))).toBe("wrong_transfer");
  });
  it("card theft / fraud report -> phishing_or_social_engineering", () => {
    expect(classifyCaseType(req({ complaint: "Someone stole my card and made transactions, please help" }))).toBe("phishing_or_social_engineering");
  });
  it("Bangla phishing: কেউ ওটিপি চেয়েছে -> phishing", () => {
    expect(classifyCaseType(req({ complaint: "কেউ ফোনে বলেছে bKash থেকে, আমার ওটিপি দিতে হবে না হলে অ্যাকাউন্ট ব্লক হবে" }))).toBe("phishing_or_social_engineering");
  });
  it("English account-takeover -> phishing", () => {
    expect(classifyCaseType(req({ complaint: "My account got hacked, I cannot log in anymore, please help" }))).toBe("phishing_or_social_engineering");
  });
  it("Bangla account-takeover -> phishing", () => {
    expect(classifyCaseType(req({ complaint: "আমার অ্যাকাউন্ট হ্যাক হয়ে গেছে, লগইন করতে পারছি না" }))).toBe("phishing_or_social_engineering");
  });
  it("English 'compromised' -> phishing", () => {
    expect(classifyCaseType(req({ complaint: "My card was compromised and money was taken out" }))).toBe("phishing_or_social_engineering");
  });
  it("Bangla 'চুরি' (theft only) -> phishing", () => {
    expect(classifyCaseType(req({ complaint: "আমার মোবাইল থেকে ২০০০০ টাকা চুরি হয়ে গেছে" }))).toBe("phishing_or_social_engineering");
  });
  it("English 'account taken over' -> phishing", () => {
    expect(classifyCaseType(req({ complaint: "Someone has taken over my account, I cannot access it" }))).toBe("phishing_or_social_engineering");
  });
});
