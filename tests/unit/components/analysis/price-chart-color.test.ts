// @vitest-environment jsdom

import { createElement } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriceChart } from "@/components/analysis/price-chart";

describe("PriceChart", () => {
  it("mounts the TradingView advanced chart script with widget config", () => {
    const { container } = render(
      createElement(PriceChart, {
        symbol: "BTC",
        timeframe: "1h",
        height: "500px",
      }),
    );

    const frame = container.querySelector('[data-slot="price-chart-frame"]');
    const widgetRoot = container.querySelector('[data-slot="price-chart-host"]');
    const script = widgetRoot?.querySelector(
      'script[data-widget-type="advanced-chart"]',
    );

    expect(frame?.getAttribute("style")).toContain("height: 500px");
    expect(widgetRoot).toBeTruthy();
    expect(
      widgetRoot?.querySelector(".tradingview-widget-container__widget"),
    ).toBeTruthy();
    expect(script?.getAttribute("src")).toBe(
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js",
    );
    expect(script?.textContent).toContain('"symbol":"BINANCE:BTCUSDT.P"');
    expect(script?.textContent).toContain('"interval":"60"');
    expect(script?.textContent).toContain('"style":"1"');
    expect(script?.textContent).toContain('"allow_symbol_change":true');
    expect(script?.textContent).toContain('"withdateranges":true');
    expect(script?.textContent).toContain('"hide_side_toolbar":true');
    expect(script?.textContent).toContain('"favorites":{"intervals":["15","60","240"]}');
    expect(script?.textContent).toContain(
      '"paneProperties.legendProperties.showSeriesOHLC":false',
    );
    expect(script?.textContent).toContain(
      '"mainSeriesProperties.showCountdown":true',
    );
  });
});
