import type { BillingCustomerContext } from "@/server/billing/subscription";
import { CitationRepository } from "@/server/features/citations/CitationRepository";
import { LocalGridRepository } from "@/server/features/local-grid/LocalGridRepository";
import { createDataforseoClient } from "@/server/lib/dataforseo";
import { readListingNap } from "@/server/features/citations/listingNap";
import {
  hasReference,
  lookupReferenceNap,
  referenceOf,
} from "@/server/features/citations/referenceNap";
import { AppError, asAppError } from "@/server/lib/errors";
import {
  CITATION_DIRECTORIES,
  directoriesForLocation,
  CITATION_SERP_DEPTH,
  mentionsBusiness,
  searchableName,
  type CitationDirectory,
} from "@/shared/citations";
import { LOCATION_OPTIONS } from "@/shared/keyword-locations";
import { compareNap } from "@/shared/nap";
import type { CreateCitationCheckInput } from "@/types/schemas/citations";

// Small batches because DataForSEO answers bursts of live searches with
// transient "Internal SE Server Error" failures. The page calls processRun
// until nothing is left.
const DIRECTORIES_PER_BATCH = 2;
// A run still pending after this long was abandoned (the tab was closed);
// settle it so the check can run again.
const STALE_RUN_MS = 30 * 60 * 1000;
// A business with several locations has several listings on one directory.
const LISTINGS_PER_DIRECTORY = 5;
const SEARCH_ATTEMPTS = 3;

type Check = NonNullable<
  Awaited<ReturnType<typeof CitationRepository.getCheck>>
>;
type Run = NonNullable<Awaited<ReturnType<typeof CitationRepository.getRun>>>;

function directoryByKey(key: string) {
  return CITATION_DIRECTORIES.find((directory) => directory.key === key);
}

function onDomain(url: URL, domain: string) {
  const host = url.hostname.toLowerCase();
  return host === domain || host.endsWith(`.${domain}`);
}

// DataForSEO fails a share of live searches with a transient server error
// that clears on retry.
async function searchWithRetry(
  keyword: string,
  check: Check,
  billingCustomer: BillingCustomerContext,
) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await createDataforseoClient(billingCustomer).serp.live({
        keyword,
        locationCode: check.locationCode,
        languageCode: check.languageCode,
        depth: CITATION_SERP_DEPTH,
      });
    } catch (error) {
      const transient = asAppError(error)?.code === "UPSTREAM_UNAVAILABLE";
      if (!transient || attempt >= SEARCH_ATTEMPTS) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

/** The directory's own business pages, from one search, that name the business. */
async function searchListings(
  keyword: string,
  check: Check,
  directory: CitationDirectory,
  billingCustomer: BillingCustomerContext,
) {
  const items = await searchWithRetry(keyword, check, billingCustomer);
  const seen = new Set<string>();
  return items.flatMap((item) => {
    if (item.type !== "organic" || !item.url) return [];
    let url: URL;
    try {
      url = new URL(item.url);
    } catch {
      return [];
    }
    if (!onDomain(url, directory.domain)) return [];
    if (!directory.listing.test(url.pathname) || seen.has(item.url)) return [];
    // A page for another business is not this business's listing.
    const text = [item.title, item.description, url.pathname].join(" ");
    if (!mentionsBusiness(check.businessName, text)) return [];
    seen.add(item.url);
    return [{ url: item.url, title: item.title ?? null }];
  });
}

/**
 * A plain search with the city first, which is cheap. Google often buries a
 * small business's page there, so a miss is retried as a site: search, which
 * DataForSEO bills at five times the price.
 */
async function findListings(
  check: Check,
  directory: CitationDirectory,
  billingCustomer: BillingCustomerContext,
) {
  const name = searchableName(check.businessName);
  const plain = [name, check.city, directory.name].filter(Boolean).join(" ");
  const found = await searchListings(plain, check, directory, billingCustomer);
  if (found.length > 0) return found.slice(0, LISTINGS_PER_DIRECTORY);

  const scoped = [`site:${directory.domain}`, `"${name}"`, check.city]
    .filter(Boolean)
    .join(" ");
  const retried = await searchListings(
    scoped,
    check,
    directory,
    billingCustomer,
  );
  return retried.slice(0, LISTINGS_PER_DIRECTORY);
}

/** Businesses already set up in this project's Local Grids, newest first. */
async function listBusinessCandidates(projectId: string) {
  const grids = await LocalGridRepository.listGrids(projectId);
  return [...new Set(grids.map((grid) => grid.businessName))];
}

async function createCheck(
  project: { id: string; locationCode: number; languageCode: string },
  input: CreateCitationCheckInput,
  billingCustomer: BillingCustomerContext,
) {
  const id = crypto.randomUUID();
  const locationCode = input.locationCode ?? project.locationCode;
  const reference = await lookupReferenceNap(
    project,
    {
      businessName: input.businessName,
      city: input.city ?? null,
      locationCode,
    },
    billingCustomer,
  );
  await CitationRepository.createCheck({
    id,
    projectId: project.id,
    businessName: input.businessName,
    city: input.city ?? null,
    locationCode,
    languageCode:
      LOCATION_OPTIONS.find((option) => option.code === locationCode)
        ?.languageCode ?? project.languageCode,
    referenceName: reference?.name ?? null,
    referenceAddress: reference?.address ?? null,
    referencePhone: reference?.phone ?? null,
    createdAt: new Date().toISOString(),
  });
  return { id };
}

async function requireCheck(projectId: string, checkId: string) {
  const check = await CitationRepository.getCheck(projectId, checkId);
  if (!check) throw new AppError("NOT_FOUND", "Citation check not found");
  return check;
}

async function settleRun(run: Run, message: string | null) {
  const results = await CitationRepository.getResultsForRuns([run.id]);
  const allFailed = results.every((result) => result.status === "error");
  await CitationRepository.updateRun(run.id, {
    status: allFailed ? "failed" : "completed",
    errorMessage: allFailed
      ? (message ?? "Every directory search failed.")
      : null,
    completedAt: new Date().toISOString(),
  });
}

async function startRun(input: { projectId: string; checkId: string }) {
  const check = await requireCheck(input.projectId, input.checkId);
  const runId = crypto.randomUUID();
  const created = await CitationRepository.tryCreateRun({
    id: runId,
    checkId: check.id,
    projectId: input.projectId,
    startedAt: new Date().toISOString(),
  });

  if (!created) {
    // A second click while a run is in flight resumes that run, not a new bill.
    const [latest] = await CitationRepository.listRuns(
      input.projectId,
      check.id,
      1,
    );
    if (latest?.status !== "pending") throw new AppError("CONFLICT");
    if (Date.now() - Date.parse(latest.startedAt) <= STALE_RUN_MS) {
      return { runId: latest.id };
    }
    await CitationRepository.failUnsettledResults(latest.id);
    await settleRun(latest, "The run did not finish in time.");
    return startRun(input);
  }

  await CitationRepository.insertResults(
    directoriesForLocation(check.locationCode).map((directory) => ({
      id: crypto.randomUUID(),
      runId,
      directory: directory.key,
    })),
  );
  return { runId };
}

/** Searches again for the directories whose search failed. */
async function retryErrored(projectId: string, runId: string) {
  const run = await CitationRepository.getRun(projectId, runId);
  if (!run) throw new AppError("NOT_FOUND", "Citation run not found");
  if (run.status === "pending") return { runId };
  const results = await CitationRepository.getResultsForRuns([run.id]);
  if (!results.some((result) => result.status === "error")) return { runId };

  // The unique index on pending runs rejects this if the check has another
  // run in flight.
  const reopened = await CitationRepository.tryReopenRun(run);
  if (!reopened) throw new AppError("CONFLICT");
  await CitationRepository.requeueErroredResults(run.id);
  return { runId };
}

/**
 * Searches the next few directories of a pending run. The staff page calls
 * this in a loop; it is the only place a citation check spends credits.
 */
async function processRun(input: {
  projectId: string;
  runId: string;
  billingCustomer: BillingCustomerContext;
}) {
  const run = await CitationRepository.getRun(input.projectId, input.runId);
  if (!run) throw new AppError("NOT_FOUND", "Citation run not found");
  if (run.status !== "pending") return { done: true };
  const check = await requireCheck(run.projectId, run.checkId);

  const claimed = await CitationRepository.claimPendingResults(
    run.id,
    DIRECTORIES_PER_BATCH,
  );
  let lastError: string | null = null;
  await Promise.all(
    claimed.map(async (row) => {
      const directory = directoryByKey(row.directory);
      try {
        if (!directory) throw new Error(`Unknown directory ${row.directory}`);
        const listings = await findListings(
          check,
          directory,
          input.billingCustomer,
        );
        // Reading a listing page is a plain fetch, so it costs no credits.
        const naps = await Promise.all(
          listings.map((listing) => readListingNap(listing.url)),
        );
        const checkedAt = new Date().toISOString();
        await CitationRepository.insertListings(
          listings.map((listing, index) => ({
            id: crypto.randomUUID(),
            resultId: row.id,
            ...listing,
            foundName: naps[index].name,
            foundAddress: naps[index].address,
            foundPhone: naps[index].phone,
            napCheckedAt: checkedAt,
          })),
        );
        await CitationRepository.settleResult(row.id, {
          status: listings.length > 0 ? "found" : "missing",
        });
      } catch (error) {
        console.warn(`[citations] ${row.directory} failed:`, error);
        lastError = error instanceof Error ? error.message : "Search failed";
        await CitationRepository.settleResult(row.id, { status: "error" });
      }
    }),
  );

  const results = await CitationRepository.getResultsForRuns([run.id]);
  const unsettled = results.some(
    (result) => result.status === "pending" || result.status === "checking",
  );
  if (unsettled) return { done: false };
  await settleRun(run, lastError);
  return { done: true };
}

function summarizeRun(
  run: Run,
  results: Array<{ runId: string; status: string }>,
) {
  const own = results.filter((result) => result.runId === run.id);
  const count = (status: string) =>
    own.filter((result) => result.status === status).length;
  return {
    id: run.id,
    status: run.status,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    errorMessage: run.errorMessage,
    total: own.length,
    unsettled: count("pending") + count("checking"),
    found: count("found"),
    missing: count("missing"),
    errored: count("error"),
  };
}

async function listChecksWithLatestRun(projectId: string) {
  const checks = await CitationRepository.listChecks(projectId);
  const latestRuns = await Promise.all(
    checks.map(async (check) => {
      const [run] = await CitationRepository.listRuns(projectId, check.id, 1);
      return run ?? null;
    }),
  );
  const results = await CitationRepository.getResultsForRuns(
    latestRuns.flatMap((run) => (run ? [run.id] : [])),
  );
  return checks.map((check, index) => {
    const run = latestRuns[index];
    return { ...check, latestRun: run ? summarizeRun(run, results) : null };
  });
}

async function getCheckDetail(projectId: string, checkId: string) {
  const check = await requireCheck(projectId, checkId);
  const runs = await CitationRepository.listRuns(projectId, checkId);
  const results = await CitationRepository.getResultsForRuns(
    runs.map((run) => run.id),
  );
  return { check, runs: runs.map((run) => summarizeRun(run, results)) };
}

async function getRunDetail(projectId: string, runId: string) {
  const run = await CitationRepository.getRun(projectId, runId);
  if (!run) throw new AppError("NOT_FOUND", "Citation run not found");
  const check = await requireCheck(projectId, run.checkId);

  // The previous finished run, so each directory can show what changed.
  const history = await CitationRepository.listRuns(projectId, run.checkId);
  const previous = history.find(
    (candidate) =>
      candidate.startedAt < run.startedAt && candidate.status === "completed",
  );
  const results = await CitationRepository.getResultsForRuns(
    previous ? [run.id, previous.id] : [run.id],
  );
  const previousStatus = new Map(
    results
      .filter((result) => result.runId === previous?.id)
      .map((result) => [result.directory, result.status]),
  );
  const own = results.filter((result) => result.runId === run.id);
  const listings = await CitationRepository.getListingsForResults(
    own.map((result) => result.id),
  );

  return {
    run: summarizeRun(run, results),
    reference: referenceOf(check),
    results: own.flatMap((result) => {
      const directory = directoryByKey(result.directory);
      if (!directory) return [];
      return [
        {
          id: result.id,
          directory: directory.key,
          directoryName: directory.name,
          status: result.status,
          previousStatus: previousStatus.get(result.directory) ?? null,
          listings: listings
            .filter((listing) => listing.resultId === result.id)
            .map((listing) => ({
              url: listing.url,
              title: listing.title,
              found: {
                name: listing.foundName,
                address: listing.foundAddress,
                phone: listing.foundPhone,
              },
              // Null for listings from runs that predate NAP checking.
              nap:
                listing.napCheckedAt && hasReference(check)
                  ? compareNap(referenceOf(check), {
                      name: listing.foundName,
                      address: listing.foundAddress,
                      phone: listing.foundPhone,
                    })
                  : null,
            })),
        },
      ];
    }),
  };
}

async function deleteCheck(projectId: string, checkId: string) {
  await CitationRepository.deleteCheck(projectId, checkId);
}

export const CitationService = {
  listBusinessCandidates,
  createCheck,
  startRun,
  retryErrored,
  processRun,
  listChecksWithLatestRun,
  getCheckDetail,
  getRunDetail,
  deleteCheck,
};
