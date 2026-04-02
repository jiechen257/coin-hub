import { db } from "@/lib/db";
import type { AttributedViewpointDraft, RawTweet, ViewpointBias } from "@/modules/tweets/attribute-viewpoints";

export type StoredTweet = {
  id: string;
  author: string;
  text: string;
  publishedAt: Date;
  createdAt: Date;
};

export type StoredAttributedViewpoint = {
  id: string;
  tweetId: string;
  symbol: string | null;
  publishedAt: Date;
  bias: ViewpointBias;
  reasoning: string | null;
  evidenceTerms: string[] | null;
  confidence: number;
  sourceType: string;
  createdAt: Date;
};

export type TweetRepository = {
  upsertTweet(tweet: RawTweet): Promise<StoredTweet>;
  storeAttributedViewpoint(input: AttributedViewpointDraft & { publishedAt: string | Date }): Promise<StoredAttributedViewpoint>;
};

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}

function mapTweet(record: {
  id: string;
  author: string;
  text: string;
  publishedAt: Date;
  createdAt: Date;
}): StoredTweet {
  return {
    id: record.id,
    author: record.author,
    text: record.text,
    publishedAt: record.publishedAt,
    createdAt: record.createdAt,
  };
}

function mapViewpoint(record: {
  id: string;
  tweetId: string;
  symbol: string | null;
  publishedAt: Date;
  bias: string;
  reasoning: string | null;
  evidenceTermsJson: unknown;
  confidence: number;
  sourceType: string;
  createdAt: Date;
}): StoredAttributedViewpoint {
  return {
    id: record.id,
    tweetId: record.tweetId,
    symbol: record.symbol,
    publishedAt: record.publishedAt,
    bias: record.bias as ViewpointBias,
    reasoning: record.reasoning,
    evidenceTerms: Array.isArray(record.evidenceTermsJson) ? (record.evidenceTermsJson as string[]) : null,
    confidence: record.confidence,
    sourceType: record.sourceType,
    createdAt: record.createdAt,
  };
}

export async function upsertTweet(tweet: RawTweet) {
  const publishedAt = toDate(tweet.publishedAt);

  const stored = await db.tweet.upsert({
    where: { id: tweet.id },
    create: {
      id: tweet.id,
      author: tweet.author ?? "unknown",
      text: tweet.text,
      publishedAt,
    },
    update: {
      author: tweet.author ?? "unknown",
      text: tweet.text,
      publishedAt,
    },
  });

  return mapTweet(stored);
}

export async function storeAttributedViewpoint(
  input: AttributedViewpointDraft & { publishedAt: string | Date }
) {
  const evidenceTermsJson = input.evidenceTerms.length > 0 ? input.evidenceTerms : undefined;

  const stored = await db.attributedViewpoint.create({
    data: {
      tweetId: input.tweetId,
      symbol: input.symbol,
      publishedAt: toDate(input.publishedAt),
      bias: input.bias,
      reasoning: input.reasoning,
      ...(evidenceTermsJson ? { evidenceTermsJson } : {}),
      confidence: input.confidence,
      sourceType: input.sourceType,
    },
  });

  return mapViewpoint(stored);
}

export const tweetRepository: TweetRepository = {
  upsertTweet,
  storeAttributedViewpoint,
};
