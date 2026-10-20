import { fetchPageHtml } from "@/server/lib/scrape";
import type { Nap } from "@/shared/nap";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function addressLine(address: unknown) {
  if (typeof address === "string") return text(address);
  if (!isRecord(address)) return null;
  const parts = [
    address.streetAddress,
    address.addressLocality,
    address.addressRegion,
    address.postalCode,
  ].flatMap((part) => text(part) ?? []);
  return parts.length > 0 ? parts.join(", ") : null;
}

/** Every object in a JSON-LD document, including @graph members and lists. */
function* walk(node: unknown): Generator<JsonRecord> {
  if (Array.isArray(node)) {
    for (const child of node) yield* walk(child);
  } else if (isRecord(node)) {
    yield node;
    yield* walk(node["@graph"]);
  }
}

function hasNap(node: JsonRecord) {
  return Boolean(node.address || node.telephone);
}

function fromJsonLd(html: string): Nap | null {
  const blocks = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const block of blocks) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(block[1]);
    } catch {
      continue;
    }
    for (const node of walk(parsed)) {
      if (!hasNap(node)) continue;
      return {
        name: text(node.name),
        address: addressLine(node.address),
        phone: text(node.telephone),
      };
    }
  }
  return null;
}

/** Last resort for pages without structured data: the first tel: link. */
function phoneFromLink(html: string) {
  const match = /href=["']tel:([^"']+)["']/i.exec(html);
  return match ? decodeURIComponent(match[1]).trim() : null;
}

export function extractNap(html: string): Nap {
  const structured = fromJsonLd(html);
  const phone = structured?.phone ?? phoneFromLink(html);
  return {
    name: structured?.name ?? null,
    address: structured?.address ?? null,
    phone,
  };
}

/** Reads the name, address and phone a listing page shows; nulls if blocked. */
export async function readListingNap(url: string): Promise<Nap> {
  const html = await fetchPageHtml(url);
  return html ? extractNap(html) : { name: null, address: null, phone: null };
}
