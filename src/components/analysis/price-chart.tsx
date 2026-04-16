"use client";

import { useEffect, useMemo, useRef } from "react";
import type {
  ResearchDeskSymbol,
  ResearchDeskTimeframe,
} from "@/components/research-desk/research-desk-types";

type PriceChartProps = {
  symbol: ResearchDeskSymbol;
  timeframe: ResearchDeskTimeframe;
  title?: string;
  description?: string;
  height?: string;
};

type TradingViewInterval = "15" | "60" | "240" | "D";

type TradingViewWidgetConfig = {
  autosize: true;
  symbol: string;
  interval: TradingViewInterval;
  timezone: "Asia/Shanghai";
  theme: "dark";
  backgroundColor: "rgba(11, 18, 32, 1)";
  style: "1";
  locale: "zh_CN";
  allow_symbol_change: true;
  withdateranges: true;
  hide_top_toolbar: false;
  hide_side_toolbar: true;
  details: false;
  hotlist: false;
  calendar: false;
  save_image: false;
  favorites: {
    intervals: ["15", "60", "240"];
  };
  overrides: {
    "paneProperties.legendProperties.showSeriesOHLC": false;
    "mainSeriesProperties.showCountdown": true;
  };
  support_host: "https://www.tradingview.com";
};

const CHART_HEIGHT_PX = 500;
const TRADING_VIEW_EMBED_URL =
  "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
const TRADING_VIEW_SYMBOLS: Record<ResearchDeskSymbol, string> = {
  BTC: "BINANCE:BTCUSDT.P",
  ETH: "BINANCE:ETHUSDT.P",
};
const TRADING_VIEW_INTERVALS: Record<ResearchDeskTimeframe, TradingViewInterval> = {
  "15m": "15",
  "1h": "60",
  "4h": "240",
  "1d": "D",
};

export function toTradingViewSymbol(symbol: ResearchDeskSymbol) {
  return TRADING_VIEW_SYMBOLS[symbol];
}

export function toTradingViewInterval(timeframe: ResearchDeskTimeframe) {
  return TRADING_VIEW_INTERVALS[timeframe];
}

export function buildTradingViewWidgetConfig(
  symbol: ResearchDeskSymbol,
  timeframe: ResearchDeskTimeframe,
): TradingViewWidgetConfig {
  return {
    autosize: true,
    symbol: toTradingViewSymbol(symbol),
    interval: toTradingViewInterval(timeframe),
    timezone: "Asia/Shanghai",
    theme: "dark",
    backgroundColor: "rgba(11, 18, 32, 1)",
    style: "1",
    locale: "zh_CN",
    allow_symbol_change: true,
    withdateranges: true,
    hide_top_toolbar: false,
    hide_side_toolbar: true,
    details: false,
    hotlist: false,
    calendar: false,
    save_image: false,
    favorites: {
      intervals: ["15", "60", "240"],
    },
    overrides: {
      "paneProperties.legendProperties.showSeriesOHLC": false,
      "mainSeriesProperties.showCountdown": true,
    },
    support_host: "https://www.tradingview.com",
  };
}

function buildSymbolLink(symbol: ResearchDeskSymbol) {
  return `https://www.tradingview.com/symbols/${toTradingViewSymbol(symbol).replace(":", "-")}/`;
}

function buildSymbolLabel(symbol: ResearchDeskSymbol) {
  return symbol === "BTC" ? "BTCUSDT 永续合约" : "ETHUSDT 永续合约";
}

export function PriceChart({
  symbol,
  timeframe,
  title = "K 线总览",
  description = "图内切换标的、周期与日期范围",
  height = "clamp(320px, 68vw, 500px)",
}: PriceChartProps) {
  const widgetHostRef = useRef<HTMLDivElement | null>(null);
  const widgetConfig = useMemo(
    () => buildTradingViewWidgetConfig(symbol, timeframe),
    [symbol, timeframe],
  );

  useEffect(() => {
    const host = widgetHostRef.current;

    if (!host) {
      return;
    }

    host.replaceChildren();

    const widgetRoot = document.createElement("div");
    widgetRoot.className = "tradingview-widget-container__widget";
    widgetRoot.style.height = "calc(100% - 32px)";
    widgetRoot.style.width = "100%";

    const copyright = document.createElement("div");
    copyright.className = "tradingview-widget-copyright";

    const link = document.createElement("a");
    link.href = buildSymbolLink(symbol);
    link.rel = "noopener nofollow";
    link.target = "_blank";

    const linkText = document.createElement("span");
    linkText.className = "text-sky-400";
    linkText.textContent = buildSymbolLabel(symbol);

    const trademark = document.createElement("span");
    trademark.className = "text-muted-foreground";
    trademark.textContent = " by TradingView";

    link.appendChild(linkText);
    copyright.append(link, trademark);

    const script = document.createElement("script");
    script.src = TRADING_VIEW_EMBED_URL;
    script.async = true;
    script.type = "text/javascript";
    script.dataset.widgetType = "advanced-chart";
    script.text = JSON.stringify(widgetConfig);

    host.append(widgetRoot, copyright, script);

    return () => {
      host.replaceChildren();
    };
  }, [symbol, widgetConfig]);

  return (
    <section className="rounded-lg border border-border/80 bg-card/95 p-5 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.18)]">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
          行情主视图
        </p>
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
          <h2 className="text-3xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div
        data-slot="price-chart-frame"
        className="mt-4 overflow-hidden rounded-lg border border-border/80"
        style={{
          height,
          backgroundColor: "rgba(11, 18, 32, 1)",
        }}
      >
        <div
          ref={widgetHostRef}
          data-slot="price-chart-host"
          className="tradingview-widget-container h-full w-full"
        />
      </div>
    </section>
  );
}
