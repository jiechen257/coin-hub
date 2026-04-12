// @vitest-environment node

import { db } from "@/lib/db";
import { ingestTweets } from "@/modules/tweets/tweet-source";

describe("tweet-source", () => {
  beforeEach(async () => {
    await db.attributedViewpoint.deleteMany();
    await db.tweet.deleteMany();
  });

  afterEach(async () => {
    await db.attributedViewpoint.deleteMany();
    await db.tweet.deleteMany();
  });

  it("ingests fetched tweets and stores attributed viewpoints", async () => {
    const imported = await ingestTweets({
      source: {
        fetchTweets: async () => [
          {
            id: "1",
            author: "alice",
            text: "BTC looks ready to break higher",
            publishedAt: "2026-04-02T00:00:00.000Z",
          },
        ],
      },
    });

    const tweet = await db.tweet.findUnique({ where: { id: "1" } });
    const viewpoint = await db.attributedViewpoint.findFirst({ where: { tweetId: "1" } });

    expect(imported).toBe(1);
    expect(tweet?.author).toBe("alice");
    expect(viewpoint?.symbol).toBe("BTC");
    expect(viewpoint?.bias).toBe("bullish");
    expect(viewpoint?.sourceType).toBe("rule");
  });
});
