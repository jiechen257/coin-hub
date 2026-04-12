import { attributeViewpoint, type RawTweet } from "@/modules/tweets/attribute-viewpoints";
import { tweetRepository, type TweetRepository } from "@/modules/tweets/tweet-repository";

export type TweetSourceClient = {
  fetchTweets(): Promise<ReadonlyArray<RawTweet>>;
};

export type TweetIngestionDependencies = {
  source?: TweetSourceClient;
  repository?: TweetRepository;
  callModel?: (prompt: string) => Promise<string>;
};

const emptyTweetSource: TweetSourceClient = {
  async fetchTweets() {
    return [];
  },
};

export async function ingestTweets(dependencies: TweetIngestionDependencies = {}) {
  const source = dependencies.source ?? emptyTweetSource;
  const repository = dependencies.repository ?? tweetRepository;
  const rawTweets = await source.fetchTweets();

  let importedCount = 0;

  for (const tweet of rawTweets) {
    // Store the raw tweet first so the attribution row always has a parent record.
    const storedTweet = await repository.upsertTweet(tweet);
    const attribution = await attributeViewpoint(tweet, dependencies.callModel ? { callModel: dependencies.callModel } : {});

    await repository.storeAttributedViewpoint({
      ...attribution,
      publishedAt: storedTweet.publishedAt,
    });

    importedCount += 1;
  }

  return importedCount;
}
