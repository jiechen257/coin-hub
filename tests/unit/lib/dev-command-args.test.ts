// @vitest-environment node

import { describe, expect, it } from "vitest";
import { parseDevCliArgs } from "@/lib/dev-command-args";

describe("parseDevCliArgs", () => {
  it("extracts restart and target while preserving next args", () => {
    expect(
      parseDevCliArgs([
        "--restart",
        "--target=production",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3010",
      ]),
    ).toEqual({
      shouldRestart: true,
      targetOverride: "production",
      forwardedArgs: ["--hostname", "127.0.0.1", "--port", "3010"],
    });
  });

  it("drops the pnpm standalone separator and supports spaced target syntax", () => {
    expect(
      parseDevCliArgs([
        "--target",
        "daily",
        "--",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3011",
      ]),
    ).toEqual({
      shouldRestart: false,
      targetOverride: "daily",
      forwardedArgs: ["--hostname", "127.0.0.1", "--port", "3011"],
    });
  });
});
