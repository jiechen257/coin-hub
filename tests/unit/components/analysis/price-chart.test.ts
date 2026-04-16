// @vitest-environment node

import {
  buildTradingViewWidgetConfig,
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
});
