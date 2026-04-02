import { summarizeReasoning, type LlmSummaryDependencies } from "@/modules/tweets/llm-summary";

export type RawTweet = {
  id: string;
  author?: string;
  text: string;
  publishedAt: string | Date;
};

export type ViewpointBias = "bullish" | "bearish" | "neutral";

export type AttributedViewpointDraft = {
  tweetId: string;
  symbol: string | null;
  bias: ViewpointBias;
  reasoning: string | null;
  evidenceTerms: string[];
  confidence: number;
  sourceType: "rule";
};

const BULLISH_TERMS = [
  "higher",
  "long",
  "bull",
  "upside",
  "breakout",
  "pump",
  "看多",
  "多头",
  "上行",
  "突破",
  "走强",
];

const BEARISH_TERMS = [
  "lower",
  "short",
  "bear",
  "downside",
  "breakdown",
  "dump",
  "看空",
  "空头",
  "下行",
  "跌破",
  "走弱",
];

function includesAny(text: string, terms: string[]) {
  const lower = text.toLowerCase();

  return terms.some((term) => lower.includes(term.toLowerCase()));
}

function matchSymbol(text: string) {
  if (/ETH/i.test(text)) {
    return "ETH";
  }

  if (/BTC/i.test(text)) {
    return "BTC";
  }

  // Keep the first-pass classifier simple until we add a richer ticker map.
  return "BTC";
}

function matchBias(text: string): ViewpointBias {
  if (includesAny(text, BULLISH_TERMS)) {
    return "bullish";
  }

  if (includesAny(text, BEARISH_TERMS)) {
    return "bearish";
  }

  return "neutral";
}

function collectEvidenceTerms(text: string) {
  const evidenceTerms = [...BULLISH_TERMS, ...BEARISH_TERMS].filter((term) =>
    includesAny(text, [term]),
  );

  return [...new Set(evidenceTerms)];
}

function confidenceForBias(bias: ViewpointBias) {
  if (bias === "neutral") {
    return 0.35;
  }

  return 0.6;
}

export async function attributeViewpoint(
  tweet: RawTweet,
  dependencies: LlmSummaryDependencies = {}
): Promise<AttributedViewpointDraft> {
  const symbol = matchSymbol(tweet.text);
  const bias = matchBias(tweet.text);
  const evidenceTerms = collectEvidenceTerms(tweet.text);
  const reasoning = await summarizeReasoning(tweet, dependencies);

  return {
    tweetId: tweet.id,
    symbol,
    bias,
    reasoning,
    evidenceTerms,
    confidence: confidenceForBias(bias),
    sourceType: "rule",
  };
}
