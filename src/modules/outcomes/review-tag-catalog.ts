export const DEFAULT_REVIEW_TAGS = ["趋势跟随", "突破追随", "区间反转", "止损纪律差"] as const;

export type ReviewTagKind = "preset" | "custom";

export function getReviewTagKind(label: string): ReviewTagKind {
  return DEFAULT_REVIEW_TAGS.includes(label as (typeof DEFAULT_REVIEW_TAGS)[number])
    ? "preset"
    : "custom";
}
