import type { Facts, Lang, Prose } from "./types";
import type { CaseType } from "./schema";

const PIN_EN = "Please do not share your PIN or OTP with anyone.";
const PIN_BN = "অনুগ্রহ করে কারো সাথে আপনার পিন বা ওটিপি শেয়ার করবেন না।";

function phishing(): Prose {
  return {
    agent_summary: "Customer reports a suspicious contact requesting credentials (possible social engineering); no credentials reported shared.",
    recommended_next_action: "Escalate to the fraud risk team immediately. Confirm the company never asks for OTP/PIN and log the reported contact for fraud analysis.",
    customer_reply: "Thank you for reaching out before sharing any information. We never ask for your PIN, OTP, or password under any circumstances. Please do not share these with anyone, even if they claim to be from us. Our fraud team has been notified of this incident.",
  };
}
function phishingBn(en: Prose): Prose {
  return { ...en, customer_reply: "আপনি কোনো তথ্য শেয়ার করার আগে যোগাযোগ করায় ধন্যবাদ। আমরা কখনোই আপনার পিন, ওটিপি বা পাসওয়ার্ড চাই না। অনুগ্রহ করে এগুলো কারো সাথে শেয়ার করবেন না, এমনকি কেউ নিজেকে আমাদের প্রতিনিধি দাবি করলেও। আমাদের ফ্রড টিমকে বিষয়টি জানানো হয়েছে।" };
}
function clarification(lang: Lang): Prose {
  return {
    agent_summary: "Customer raised an issue but the details are insufficient to identify a specific transaction.",
    recommended_next_action: "Reply to the customer requesting the specific transaction ID, amount, approximate time, and what went wrong.",
    customer_reply: lang === "bn"
      ? `যোগাযোগ করার জন্য ধন্যবাদ। আপনাকে দ্রুত সাহায্য করতে অনুগ্রহ করে লেনদেন আইডি, সংশ্লিষ্ট পরিমাণ এবং কী সমস্যা হয়েছে তা সংক্ষেপে জানান। ${PIN_BN}`
      : `Thank you for reaching out. To help you faster, please share the transaction ID, the amount involved, and a short description of what went wrong. ${PIN_EN}`,
  };
}


function caseProse(f: Facts): Prose {
  const tid = f.relevant_transaction_id ?? "the relevant transaction";
  const amount = f.relevant_transaction ? `${f.relevant_transaction.amount} BDT` : "the amount";
  const cp = f.relevant_transaction?.counterparty ?? "the recipient";
  const bn = f.language === "bn";

  const table: Record<Exclude<CaseType, "phishing_or_social_engineering">, Prose> = {
    wrong_transfer: {
      agent_summary: `Customer reports transaction ${tid} (${amount} to ${cp}) may have been sent to the wrong recipient.`,
      recommended_next_action: `Verify ${tid} details with the customer and initiate the wrong-transfer dispute workflow per policy.`,
      customer_reply: bn
        ? `আপনার লেনদেন ${tid} সম্পর্কে আমরা অবগত হয়েছি। ${PIN_BN} আমাদের ডিসপিউট টিম বিষয়টি পর্যালোচনা করে অফিসিয়াল চ্যানেলে আপনার সাথে যোগাযোগ করবে।`
        : `We have noted your concern about transaction ${tid}. ${PIN_EN} Our dispute resolution team will review the case and contact you through official support channels.`,
    },
    payment_failed: {
      agent_summary: `Customer reports a failed payment ${tid} (${amount}) with a possible balance deduction.`,
      recommended_next_action: `Investigate ${tid} ledger status; if balance was deducted on a failed payment, initiate the automatic reversal flow within standard SLA.`,
      customer_reply: bn
        ? `আমরা লক্ষ্য করেছি যে লেনদেন ${tid} এর কারণে অপ্রত্যাশিত ব্যালেন্স কাটা হতে পারে। আমাদের পেমেন্টস টিম এটি যাচাই করবে এবং কোনো প্রযোজ্য পরিমাণ অফিসিয়াল চ্যানেলের মাধ্যমে ফেরত দেওয়া হবে। ${PIN_BN}`
        : `We have noted that transaction ${tid} may have caused an unexpected balance deduction. Our payments team will review it and any eligible amount will be returned through official channels. ${PIN_EN}`,
    },
    refund_request: {
      agent_summary: `Customer requests a refund for ${tid} (${amount}); not a reported service failure.`,
      recommended_next_action: `Inform the customer that refund eligibility depends on the merchant's policy and provide guidance on contacting the merchant through official channels.`,
      customer_reply: bn
        ? `যোগাযোগ করার জন্য ধন্যবাদ। সম্পন্ন মার্চেন্ট পেমেন্টের রিফান্ড মার্চেন্টের নিজস্ব নীতির উপর নির্ভর করে। আমরা অফিসিয়াল চ্যানেলের মাধ্যমে মার্চেন্টের সাথে যোগাযোগ করার পরামর্শ দিই। ${PIN_BN}`
        : `Thank you for reaching out. Refunds for completed merchant payments depend on the merchant's own policy. We recommend contacting the merchant through official channels. ${PIN_EN}`,
    },
    duplicate_payment: {
      agent_summary: `Customer reports a possible duplicate payment; ${tid} appears to be the duplicate charge.`,
      recommended_next_action: `Verify the duplicate with payments operations; if the biller confirms a single charge, initiate reversal of ${tid}.`,
      customer_reply: bn
        ? `লেনদেন ${tid} এর সম্ভাব্য দ্বৈত পেমেন্টের বিষয়টি আমরা অবগত হয়েছি। আমাদের পেমেন্টস টিম বিলারের সাথে যাচাই করবে এবং কোনো প্রযোজ্য পরিমাণ অফিসিয়াল চ্যানেলের মাধ্যমে ফেরত দেওয়া হবে। ${PIN_BN}`
        : `We have noted the possible duplicate payment for transaction ${tid}. Our payments team will verify with the biller and any eligible amount will be returned through official channels. ${PIN_EN}`,
    },
    merchant_settlement_delay: {
      agent_summary: `Merchant reports settlement ${tid} (${amount}) delayed beyond the expected window.`,
      recommended_next_action: `Route to merchant operations to verify the settlement batch status and communicate a revised ETA if delayed.`,
      customer_reply: bn
        ? `আপনার সেটেলমেন্ট ${tid} সম্পর্কে আমরা অবগত হয়েছি। আমাদের মার্চেন্ট অপারেশন্স দল ব্যাচের অবস্থা যাচাই করে অফিসিয়াল চ্যানেলে প্রত্যাশিত সময় জানাবে।`
        : `We have noted your concern about settlement ${tid}. Our merchant operations team will check the batch status and update you on the expected settlement time through official channels.`,
    },
    agent_cash_in_issue: {
      agent_summary: `Customer reports a cash-in via agent (${tid}, ${amount}) not reflected in balance.`,
      recommended_next_action: `Investigate ${tid} status with agent operations; confirm settlement state and resolve within the standard cash-in SLA.`,
      customer_reply: bn
        ? `আপনার লেনদেন ${tid} এর বিষয়ে আমরা অবগত হয়েছি। আমাদের এজেন্ট অপারেশন্স দল এটি দ্রুত যাচাই করবে এবং অফিসিয়াল চ্যানেলে আপনাকে জানাবে। ${PIN_BN}`
        : `We have noted your transaction ${tid}. Our agent operations team will verify it promptly and update you through official channels. ${PIN_EN}`,
    },
    other: {
      agent_summary: `Customer raised a general support query regarding ${tid}.`,
      recommended_next_action: `Review the customer's request and route to customer support for follow-up.`,
      customer_reply: bn
        ? `যোগাযোগ করার জন্য ধন্যবাদ। আমাদের সাপোর্ট টিম আপনার অনুরোধ পর্যালোচনা করে অফিসিয়াল চ্যানেলে উত্তর দেবে। ${PIN_BN}`
        : `Thank you for reaching out. Our support team will review your request and respond through official channels. ${PIN_EN}`,
    },
  };
  return table[f.case_type as Exclude<CaseType, "phishing_or_social_engineering">];
}

export function buildReply(f: Facts): Prose {
  if (f.case_type === "phishing_or_social_engineering") {
    const en = phishing();
    return f.language === "bn" ? phishingBn(en) : en;
  }
  if (f.evidence_verdict === "insufficient_data") return clarification(f.language);
  return caseProse(f);
}
