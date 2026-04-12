export type Candle = {
  symbol?: string;
  openTime: number | Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type ChanTrendBias = "up" | "down" | "sideways";

export type ChanFractal = {
  kind: "top" | "bottom";
  openTime: number | Date;
  price: number;
};

export type ChanStroke = {
  direction: "up" | "down";
  startTime: number | Date;
  endTime: number | Date;
};

export type ChanSegment = {
  direction: "up" | "down" | "sideways";
  startTime: number | Date;
  endTime: number | Date;
};

export type ChanZone = {
  low: number;
  high: number;
};

export type ChanKeyLevel = {
  price: number;
  kind: "support" | "resistance";
};

export type ChanState = {
  symbol: string | null;
  trendBias: ChanTrendBias;
  structureSummary: string;
  fractals: ChanFractal[];
  strokes: ChanStroke[];
  segments: ChanSegment[];
  zs: ChanZone[];
  keyLevels: ChanKeyLevel[];
  timeframeStates: Record<string, unknown>;
};
