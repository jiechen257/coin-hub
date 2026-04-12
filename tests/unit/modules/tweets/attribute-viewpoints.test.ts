// @vitest-environment node

import { attributeViewpoint } from "@/modules/tweets/attribute-viewpoints";

it("extracts bias and symbol from a bullish BTC tweet", async () => {
  const result = await attributeViewpoint({
    id: "1",
    text: "BTC looks ready to break higher",
    publishedAt: new Date().toISOString(),
  });

  expect(result.symbol).toBe("BTC");
  expect(result.bias).toBe("bullish");
});
