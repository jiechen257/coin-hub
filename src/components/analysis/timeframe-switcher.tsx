"use client";

import type { ResearchDeskTimeframe } from "@/components/research-desk/research-desk-types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type TimeframeSwitcherProps = {
  value: ResearchDeskTimeframe;
  onChange: (timeframe: ResearchDeskTimeframe) => void;
  disabled?: boolean;
};

const TIMEFRAMES: ResearchDeskTimeframe[] = ["15m", "1h", "4h", "1d"];

export function TimeframeSwitcher({
  value,
  onChange,
  disabled = false,
}: TimeframeSwitcherProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onChange(nextValue as ResearchDeskTimeframe);
        }
      }}
      disabled={disabled}
      variant="default"
      aria-label="时间周期切换"
      className="w-fit flex-wrap"
    >
      {TIMEFRAMES.map((timeframe) => (
        <ToggleGroupItem key={timeframe} value={timeframe} aria-label={timeframe}>
          {timeframe}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
