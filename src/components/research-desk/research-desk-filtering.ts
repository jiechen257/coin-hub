import type {
  ResearchDeskOutcome,
  ResearchDeskOutcomeAggregates,
  ResearchDeskOutcomeCounts,
  ResearchDeskRecord,
  ResearchDeskResultFilter,
  ResearchDeskReviewTagFilter,
  ResearchDeskReviewTagKind,
} from "@/components/research-desk/research-desk-types";
import { getReviewTagKind } from "@/modules/outcomes/review-tag-catalog";

export type ResearchDeskActiveFilters = {
  resultFilter: ResearchDeskResultFilter;
  reviewTagFilter: ResearchDeskReviewTagFilter;
};

function buildEmptyCounts(): ResearchDeskOutcomeCounts {
  return {
    good: 0,
    neutral: 0,
    bad: 0,
    pending: 0,
    total: 0,
  };
}

export function filterOutcomes(
  outcomes: ResearchDeskOutcome[],
  filters: ResearchDeskActiveFilters,
) {
  return outcomes.filter((outcome) => {
    const matchesResult =
      filters.resultFilter === "all" || outcome.resultLabel === filters.resultFilter;
    const matchesReviewTag =
      filters.reviewTagFilter === null ||
      outcome.reviewTags.includes(filters.reviewTagFilter);

    return matchesResult && matchesReviewTag;
  });
}

export function buildOutcomeAggregates(
  outcomes: ResearchDeskOutcome[],
): ResearchDeskOutcomeAggregates {
  const counts = buildEmptyCounts();
  const reviewTags = new Map<string, { count: number; kind: ResearchDeskReviewTagKind }>();

  for (const outcome of outcomes) {
    counts[outcome.resultLabel] += 1;
    counts.total += 1;

    for (const reviewTag of outcome.reviewTags) {
      const current = reviewTags.get(reviewTag);

      reviewTags.set(reviewTag, {
        count: (current?.count ?? 0) + 1,
        kind: getReviewTagKind(reviewTag) as ResearchDeskReviewTagKind,
      });
    }
  }

  return {
    counts,
    reviewTags: [...reviewTags.entries()]
      .map(([label, detail]) => ({
        label,
        count: detail.count,
        kind: detail.kind,
      }))
      .sort((left, right) => {
        if (left.count !== right.count) {
          return right.count - left.count;
        }

        return left.label.localeCompare(right.label, "zh-Hans-CN");
      }),
  };
}

export function findOutcomeForRecord(
  outcomes: ResearchDeskOutcome[],
  recordId: string | null,
) {
  if (!recordId) {
    return null;
  }

  return outcomes.find((outcome) => outcome.recordId === recordId) ?? null;
}

export function findRecordForPlanId(
  records: ResearchDeskRecord[],
  planId: string | null,
) {
  if (!planId) {
    return null;
  }

  return (
    records.find((record) =>
      record.executionPlans.some((executionPlan) => executionPlan.id === planId),
    ) ?? null
  );
}

export function findRecordForOutcome(
  records: ResearchDeskRecord[],
  outcome: ResearchDeskOutcome | null,
) {
  if (!outcome) {
    return null;
  }

  if (outcome.recordId) {
    const record = records.find((item) => item.id === outcome.recordId) ?? null;

    if (record) {
      return record;
    }
  }

  return findRecordForPlanId(records, outcome.planId);
}

export function resolveOutcomeId(
  outcomes: ResearchDeskOutcome[],
  options: {
    preferredOutcomeId?: string | null;
    preferredRecordId?: string | null;
    fallbackOutcomeId?: string | null;
    allowFirstOutcomeFallback?: boolean;
  },
) {
  if (options.preferredOutcomeId) {
    const preferredOutcome = outcomes.find(
      (outcome) => outcome.id === options.preferredOutcomeId,
    );

    if (preferredOutcome) {
      return preferredOutcome.id;
    }
  }

  const preferredRecordOutcome = findOutcomeForRecord(
    outcomes,
    options.preferredRecordId ?? null,
  );

  if (preferredRecordOutcome) {
    return preferredRecordOutcome.id;
  }

  if (options.fallbackOutcomeId) {
    const fallbackOutcome = outcomes.find(
      (outcome) => outcome.id === options.fallbackOutcomeId,
    );

    if (fallbackOutcome) {
      return fallbackOutcome.id;
    }
  }

  if (options.allowFirstOutcomeFallback === false) {
    return null;
  }

  return outcomes[0]?.id ?? null;
}

export function hasReviewTagOption(
  reviewTagFilter: ResearchDeskReviewTagFilter,
  options: Array<{ label: string }>,
) {
  if (reviewTagFilter === null) {
    return true;
  }

  return options.some((option) => option.label === reviewTagFilter);
}
