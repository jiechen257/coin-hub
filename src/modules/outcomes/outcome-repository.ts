import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  DEFAULT_REVIEW_TAGS,
  getReviewTagKind,
} from "@/modules/outcomes/review-tag-catalog";

export type OutcomeSubjectType = "record" | "plan";

type BaseOutcomeInput = {
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

export type UpsertRecordOutcomeInput =
  | (BaseOutcomeInput & {
      subjectType: "record";
      subjectId: string;
    })
  | (BaseOutcomeInput & {
      subjectType: "plan";
      subjectId: string;
    });

export type ListSliceOutcomesInput = {
  symbol: string;
  timeframe: string;
};

export class OutcomeNotFoundError extends Error {
  readonly outcomeId: string;

  constructor(outcomeId: string) {
    super(`Record outcome ${outcomeId} does not exist.`);
    this.name = "OutcomeNotFoundError";
    this.outcomeId = outcomeId;
  }
}

type RecordOutcomeWithReviewTags = Prisma.RecordOutcomeGetPayload<{
  include: {
    reviewTags: {
      include: {
        tag: true;
      };
    };
  };
}>;

const reviewTagOrder = new Map<string, number>(
  DEFAULT_REVIEW_TAGS.map((label, index) => [label, index]),
);

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
  const subjectType: OutcomeSubjectType = outcome.planId ? "plan" : "record";
  const subjectId = outcome.planId ?? outcome.recordId;

  if (!subjectId) {
    throw new Error(`Record outcome ${outcome.id} is missing a persisted subject.`);
  }

  return {
    id: outcome.id,
    subjectType,
    subjectId,
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

function buildSubjectStorage(input: UpsertRecordOutcomeInput) {
  return input.subjectType === "record"
    ? {
        recordId: input.subjectId,
        planId: null,
      }
    : {
        recordId: null,
        planId: input.subjectId,
      };
}

function buildOutcomeWhereUnique(
  input: UpsertRecordOutcomeInput,
): Prisma.RecordOutcomeWhereUniqueInput {
  return input.subjectType === "record"
    ? {
        recordScopeKey: {
          recordId: input.subjectId,
          timeframe: input.timeframe,
          windowType: input.windowType,
        },
      }
    : {
        planScopeKey: {
          planId: input.subjectId,
          timeframe: input.timeframe,
          windowType: input.windowType,
        },
      };
}

export async function upsertRecordOutcome(input: UpsertRecordOutcomeInput) {
  const payload = {
    ...buildSubjectStorage(input),
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

  const outcome = await db.recordOutcome.upsert({
    where: buildOutcomeWhereUnique(input),
    create: payload,
    update: payload,
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
      throw new OutcomeNotFoundError(outcomeId);
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
    throw new OutcomeNotFoundError(outcomeId);
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
