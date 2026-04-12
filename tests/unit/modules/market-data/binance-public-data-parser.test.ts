// @vitest-environment node

import { strToU8, zipSync } from "fflate";
import { parseBinancePublicDataArchive } from "@/modules/market-data/binance-public-data-parser";

describe("binance-public-data-parser", () => {
  it("parses a Binance public-data zip archive into raw candles", () => {
    const csv = [
      "open_time,open,high,low,close,volume,close_time,quote_volume,count,taker_buy_volume,taker_buy_quote_volume,ignore",
      "1705280400000,43000,43200,42800,43100,120.5,1705283999999,0,0,0,0,0",
      "1705284000000,43100,43500,43000,43450,98.2,1705287599999,0,0,0,0,0",
    ].join("\n");
    const archive = zipSync({
      "BTCUSDT-1h-2024-01-15.csv": strToU8(csv),
    });

    const candles = parseBinancePublicDataArchive(archive);

    expect(candles).toEqual([
      {
        openTime: 1_705_280_400_000,
        open: 43_000,
        high: 43_200,
        low: 42_800,
        close: 43_100,
        volume: 120.5,
      },
      {
        openTime: 1_705_284_000_000,
        open: 43_100,
        high: 43_500,
        low: 43_000,
        close: 43_450,
        volume: 98.2,
      },
    ]);
  });

  it("throws when the archive does not contain a csv file", () => {
    const archive = zipSync({
      "README.txt": strToU8("no csv"),
    });

    expect(() => parseBinancePublicDataArchive(archive)).toThrow(
      "binance public-data archive does not contain a csv file"
    );
  });
});
