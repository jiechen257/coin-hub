import type {
  ResearchDeskOutcome,
  ResearchDeskOutcomeResultLabel,
  ResearchDeskResultFilter,
} from "@/components/research-desk/research-desk-types";

const RESULT_LABEL_TEXT: Record<ResearchDeskOutcomeResultLabel, string> = {
  good: "正向",
  neutral: "中性",
  bad: "逆向",
  pending: "待补齐",
};

const RESULT_FILTER_TEXT: Record<ResearchDeskResultFilter, string> = {
  all: "全部结果",
  good: "正向",
  neutral: "中性",
  bad: "逆向",
};

const WINDOW_TYPE_TEXT: Record<string, string> = {
  "trade-follow-through": "交易后续跟踪",
  "plan-follow-through": "观点后续跟踪",
};

const SUBJECT_TYPE_TEXT: Record<ResearchDeskOutcome["subjectType"], string> = {
  record: "记录复盘",
  plan: "方案复盘",
};

export function formatOutcomeResultLabel(label: ResearchDeskOutcomeResultLabel) {
  return RESULT_LABEL_TEXT[label];
}

export function formatOutcomeResultFilter(filter: ResearchDeskResultFilter) {
  return RESULT_FILTER_TEXT[filter];
}

export function formatOutcomeWindowType(windowType: string) {
  return WINDOW_TYPE_TEXT[windowType] ?? "观察窗口";
}

export function formatOutcomeSubjectType(subjectType: ResearchDeskOutcome["subjectType"]) {
  return SUBJECT_TYPE_TEXT[subjectType];
}
