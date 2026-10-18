import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProspectService } from "./ProspectService";

const repo = vi.hoisted(() => ({
  createSearch:
    vi.fn<
      (search: unknown, rows: Array<{ title: string; score: number }>) => void
    >(),
}));
const local = vi.hoisted(() => vi.fn());

vi.mock("./ProspectRepository", () => ({ ProspectRepository: repo }));
vi.mock("@/server/lib/dataforseo", () => ({
  createDataforseoClient: () => ({ serp: { local } }),
}));

const billingCustomer = {
  organizationId: "org_1",
  userEmail: "a@example.com",
  userId: "user_1",
};

const business = (overrides: Record<string, unknown>) => ({
  type: "maps_search",
  rank_group: 1,
  title: "Acme Plumbing",
  place_id: "place_acme",
  url: "https://acme.example",
  rating: { value: 4.9, votes_count: 400 },
  total_photos: 80,
  is_claimed: true,
  ...overrides,
});

async function search() {
  await ProspectService.createSearch(
    "org_1",
    {
      keyword: "plumber",
      locationName: "Lewisville",
      locationCode: 2840,
    },
    billingCustomer,
  );
  return repo.createSearch.mock.lastCall?.[1] ?? [];
}

beforeEach(() => {
  local.mockResolvedValue([]);
});

describe("ProspectService.createSearch", () => {
  it("keeps real businesses once each and scores the weak ones higher", async () => {
    local.mockResolvedValue([
      business({}),
      business({}),
      business({ type: "maps_paid_item", title: "Ad" }),
      business({
        rank_group: 15,
        title: "Bob's Pipes",
        place_id: "place_bob",
        rating: { value: 3.8, votes_count: 16 },
        total_photos: 1,
        is_claimed: false,
      }),
    ]);
    const rows = await search();
    expect(rows.map((row) => row.title)).toEqual([
      "Acme Plumbing",
      "Bob's Pipes",
    ]);
    expect(rows[0].score).toBe(0);
    expect(rows[1].score).toBe(69);
  });

  it("refuses a search that finds no businesses", async () => {
    await expect(search()).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(repo.createSearch).not.toHaveBeenCalled();
  });
});
