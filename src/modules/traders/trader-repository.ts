import { db } from "@/lib/db";

type CreateTraderProfileInput = {
  name: string;
  platform?: string;
  notes?: string;
};

export async function createTraderProfile(input: CreateTraderProfileInput) {
  return db.traderProfile.create({
    data: {
      name: input.name,
      platform: input.platform,
      notes: input.notes,
    },
  });
}

export async function listTraderProfiles() {
  return db.traderProfile.findMany({
    orderBy: { name: "asc" },
  });
}
