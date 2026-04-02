// @vitest-environment node

import { db } from "@/lib/db";
import { GET } from "@/app/api/dashboard/route";
import { POST as runAnalysis } from "@/app/api/analysis/run/route";

describe("dashboard api", () => {
  beforeEach(async () => {
    await db.runSnapshot.deleteMany();
  });

  afterEach(async () => {
    await db.runSnapshot.deleteMany();
  });

  it("returns BTC and ETH cards for the command center", async () => {
    const response = await GET();
    const data = (await response.json()) as {
      assets: {
        BTC?: unknown;
        ETH?: unknown;
      };
    };

    expect(data.assets.BTC).toBeDefined();
    expect(data.assets.ETH).toBeDefined();
  });

  it("enqueues a manual analysis job for the command center", async () => {
    const response = await runAnalysis(
      new Request("http://localhost/api/analysis/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    expect(response.status).toBe(201);

    const data = (await response.json()) as {
      job: {
        type: string;
        status: string;
        payload: {
          mode: string;
        };
      };
    };

    expect(data.job.type).toBe("analysis");
    expect(data.job.status).toBe("queued");
    expect(data.job.payload.mode).toBe("manual");
  });
});
