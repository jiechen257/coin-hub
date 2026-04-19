// @vitest-environment jsdom

import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import {
  buildTradingViewWidgetConfig,
  PriceChart,
  toTradingViewInterval,
  toTradingViewSymbol,
} from "@/components/analysis/price-chart";

describe("price-chart tradingview helpers", () => {
  it("maps research desk symbols to TradingView BINANCE symbols", () => {
    expect(toTradingViewSymbol("BTC")).toBe("BINANCE:BTCUSDT.P");
    expect(toTradingViewSymbol("ETH")).toBe("BINANCE:ETHUSDT.P");
  });

  it("maps research desk timeframes to TradingView widget intervals", () => {
    expect(toTradingViewInterval("15m")).toBe("15");
    expect(toTradingViewInterval("1h")).toBe("60");
    expect(toTradingViewInterval("4h")).toBe("240");
    expect(toTradingViewInterval("1d")).toBe("D");
  });

  it("builds an advanced chart config with internal symbol and interval controls", () => {
    expect(buildTradingViewWidgetConfig("BTC", "15m")).toEqual({
      autosize: true,
      symbol: "BINANCE:BTCUSDT.P",
      interval: "15",
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
    });
  });

  it("renders TradingView as a secondary reference view", () => {
    render(
      createElement(PriceChart, {
        symbol: "BTC",
        timeframe: "1h",
        height: "420px",
      }),
    );

    expect(screen.getByText("TradingView 参考视图")).toBeInTheDocument();
    expect(screen.getByText("次级参考位")).toBeInTheDocument();
    expect(
      screen.getByText(/保留原生行情细节，作为本地研究图旁的次级参考位/),
    ).toBeInTheDocument();
  });
});
