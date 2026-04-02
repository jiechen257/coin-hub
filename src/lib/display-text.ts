export function formatRunMode(mode: string) {
  switch (mode) {
    case "manual":
      return "手动运行";
    case "scheduled":
      return "定时运行";
    default:
      return mode;
  }
}

export function formatAssetStatus(status: string) {
  switch (status) {
    case "ready":
      return "就绪";
    case "queued":
      return "排队中";
    case "processing":
      return "处理中";
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
    default:
      return status;
  }
}

export function formatSignalBias(bias: string) {
  switch (bias) {
    case "long":
      return "做多";
    case "wait":
      return "观望";
    case "bullish":
      return "看多";
    case "bearish":
      return "看空";
    case "neutral":
      return "中性";
    default:
      return bias;
  }
}
