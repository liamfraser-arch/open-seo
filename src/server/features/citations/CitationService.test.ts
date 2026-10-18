import { beforeEach, describe, expect, it, vi } from "vitest";
import { CitationService } from "./CitationService";

const repo = vi.hoisted(() => ({
  getRun: vi.fn(),
  getCheck: vi.fn(),
  claimPendingResults: vi.fn(),
  settleResult: vi.fn<(id: string, data: Record<string, unknown>) => void>(),
  insertListings: vi.fn<(rows: Array<{ url: string }>) => void>(),
  getResultsForRuns: vi.fn(),
  updateRun: vi.fn(),
}));
const live = vi.hoisted(() => vi.fn());

vi.mock("./CitationRepository", () => ({ CitationRepository: repo }));
vi.mock("@/server/features/local-grid/LocalGridRepository", () => ({
  LocalGridRepository: {},
}));
vi.mock("@/server/lib/dataforseo", () => ({
  createDataforseoClient: () => ({ serp: { live } }),
}));

const billingCustomer = {
  organizationId: "org_1",
  userEmail: "a@example.com",
  userId: "user_1",
};

const organic = (url: string, title: string) => ({
  type: "organic",
  url,
  title,
});

async function processYelp() {
  await CitationService.processRun({
    projectId: "project_1",
    runId: "run_1",
    billingCustomer,
  });
  return {
    status: repo.settleResult.mock.lastCall?.[1],
    urls: repo.insertListings.mock.lastCall?.[0].map((row) => row.url),
  };
}

beforeEach(() => {
  repo.getRun.mockResolvedValue({
    id: "run_1",
    projectId: "project_1",
    checkId: "check_1",
    status: "pending",
  });
  repo.getCheck.mockResolvedValue({
    id: "check_1",
    projectId: "project_1",
    businessName: "Cold Factor Heating & Air Services LLC",
    city: null,
    locationCode: 2840,
    languageCode: "en",
  });
  repo.claimPendingResults.mockResolvedValue([
    { id: "result_1", directory: "yelp" },
  ]);
  repo.getResultsForRuns.mockResolvedValue([{ status: "found" }]);
});

describe("CitationService.processRun", () => {
  it("falls back to a site: search when the plain search finds nothing", async () => {
    live
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        organic(
          "https://www.yelp.com/biz/cold-factor-lewisville",
          "Cold Factor Heating & Air Services",
        ),
      ]);
    expect((await processYelp()).status).toEqual({ status: "found" });
    expect(live.mock.calls[1][0]).toMatchObject({
      keyword: 'site:yelp.com "cold factor heating air services"',
    });
  });

  it("finds every location's listing on the directory", async () => {
    live.mockResolvedValue([
      organic(
        "https://www.yelp.com/biz/cold-factor-heating-air-services-roanoke",
        "Cold Factor Heating & Air Services",
      ),
      organic(
        "https://www.yelp.com/biz/cold-factor-heating-air-services-flower-mound",
        "Cold Factor Heating & Air Services",
      ),
    ]);
    expect(await processYelp()).toEqual({
      status: { status: "found" },
      urls: [
        "https://www.yelp.com/biz/cold-factor-heating-air-services-roanoke",
        "https://www.yelp.com/biz/cold-factor-heating-air-services-flower-mound",
      ],
    });
  });

  it("ignores other businesses, other sites and search pages", async () => {
    live.mockResolvedValue([
      organic("https://www.yelp.com/biz/bobs-burgers", "Bob's Burgers"),
      organic("https://example.com/cold-factor", "Cold Factor"),
      organic(
        "https://www.yelp.com/search?find_desc=Cold+Factor+Heating+Air",
        "Cold Factor Heating & Air Services",
      ),
    ]);
    expect((await processYelp()).status).toEqual({ status: "missing" });
  });
});
