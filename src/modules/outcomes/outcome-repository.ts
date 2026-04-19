import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  DEFAULT_REVIEW_TAGS,
  getReviewTagKind,
} from "@/modules/outcomes/review-tag-catalog";

export type UpsertRecordOutcomeInput = {
  recordId: string;
  symbol: string;
  timeframe: string;
  windowType: string;
  windowStartAt: Date;
  windowEndAt: Date;
  resultLabel: string;
  resultReason: string;
  forwardReturnPercent?: number | null;
  maxFavorableExcursionPercent?: number | null;
  maxAdverseExcursionPercent?: number | null;
  ruleVersion: string;
};

export type ListSliceOutcomesInput = {
  symbol: string;
  timeframe: string;
};

type RecordOutcomeWithReviewTags = Prisma.RecordOutcomeGetPayload<{
  include: {
    reviewTags: {
      include: {
        tag: true;
      };
    };
  };
}>;

const reviewTagOrder = new Map(DEFAULT_REVIEW_TAGS.map((label, index) => [label, index]));

function sortReviewTags(labels: string[]) {
  return [...labels].sort((left, right) => {
    const leftIndex = reviewTagOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = reviewTagOrder.get(right) ?? Number.MAX_SAFE_INTEGER;

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return left.localeCompare(right, "zh-Hans-CN");
  });
}

function mapRecordOutcome(outcome: RecordOutcomeWithReviewTags) {
  return {
    id: outcome.id,
    recordId: outcome.recordId,
    planId: outcome.planId,
    symbol: outcome.symbol,
    timeframe: outcome.timeframe,
    windowType: outcome.windowType,
    windowStartAt: outcome.windowStartAt,
    windowEndAt: outcome.windowEndAt,
    resultLabel: outcome.resultLabel,
    resultReason: outcome.resultReason,
    forwardReturnPercent: outcome.forwardReturnPercent,
    maxFavorableExcursionPercent: outcome.maxFavorableExcursionPercent,
    maxAdverseExcursionPercent: outcome.maxAdverseExcursionPercent,
    ruleVersion: outcome.ruleVersion,
    computedAt: outcome.computedAt,
    reviewTags: sortReviewTags(outcome.reviewTags.map((link) => link.tag.label)),
  };
}

async function getOutcomeById(outcomeId: string) {
  return db.recordOutcome.findUnique({
    where: { id: outcomeId },
    include: {
      reviewTags: {
        include: {
          tag: true,
        },
      },
    },
  });
}

export async function upsertRecordOutcome(input: UpsertRecordOutcomeInput) {
  const payload = {
    recordId: input.recordId,
    symbol: input.symbol,
    timeframe: input.timeframe,
    windowType: input.windowType,
    windowStartAt: input.windowStartAt,
    windowEndAt: input.windowEndAt,
    resultLabel: input.resultLabel,
    resultReason: input.resultReason,
    forwardReturnPercent: input.forwardReturnPercent ?? null,
    maxFavorableExcursionPercent: input.maxFavorableExcursionPercent ?? null,
    maxAdverseExcursionPercent: input.maxAdverseExcursionPercent ?? null,
    ruleVersion: input.ruleVersion,
  };

  const existing = await db.recordOutcome.findFirst({
    where: {
      recordId: input.recordId,
      timeframe: input.timeframe,
      windowType: input.windowType,
    },
    select: { id: true },
  });

  const outcome = existing
    ? await db.recordOutcome.update({
        where: { id: existing.id },
        data: payload,
        include: {
          reviewTags: {
            include: {
              tag: true,
            },
          },
        },
      })
    : await db.recordOutcome.create({
        data: payload,
        include: {
          reviewTags: {
            include: {
              tag: true,
            },
          },
        },
      });

  return mapRecordOutcome(outcome);
}

export async function replaceReviewTags(outcomeId: string, labels: string[]) {
  const normalizedLabels = Array.from(
    new Set(labels.map((label) => label.trim()).filter((label) => label.length > 0)),
  );

  await db.$transaction(async (tx) => {
    const outcome = await tx.recordOutcome.findUnique({
      where: { id: outcomeId },
      select: { id: true },
    });

    if (!outcome) {
      throw new Error(`Record outcome ${outcomeId} does not exist.`);
    }

    await tx.recordOutcomeReviewTag.deleteMany({
      where: { outcomeId },
    });

    for (const label of normalizedLabels) {
      const tag = await tx.reviewTag.upsert({
        where: { label },
        create: {
          label,
          kind: getReviewTagKind(label),
        },
        update: {
          kind: getReviewTagKind(label),
        },
      });

      await tx.recordOutcomeReviewTag.create({
        data: {
          outcomeId,
          tagId: tag.id,
        },
      });
    }
  });

  const outcome = await getOutcomeById(outcomeId);

  if (!outcome) {
    throw new Error(`Record outcome ${outcomeId} does not exist.`);
  }

  return mapRecordOutcome(outcome);
}

export async function listSliceOutcomes(input: ListSliceOutcomesInput) {
  const outcomes = await db.recordOutcome.findMany({
    where: {
      symbol: input.symbol,
      timeframe: input.timeframe,
    },
    include: {
      reviewTags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: [{ windowStartAt: "desc" }, { computedAt: "desc" }],
  });

  return outcomes.map(mapRecordOutcome);
}

export const outcomeRepository = {
  upsertRecordOutcome,
  replaceReviewTags,
  listSliceOutcomes,
};
