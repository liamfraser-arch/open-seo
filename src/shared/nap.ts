// Compares the name, address and phone a directory shows against the ones on
// the Google Business Profile. Directories format the same details many ways
// ("Suite 4" / "Ste. 4", "(817) 555-0100" / "+1 817-555-0100"), so each field
// is normalised before it is compared.

export type Nap = {
  name: string | null;
  address: string | null;
  phone: string | null;
};

/** "missing" means the listing page did not show that detail. */
export type NapFieldResult = "match" | "mismatch" | "missing";

export type NapComparison = {
  name: NapFieldResult;
  address: NapFieldResult;
  phone: NapFieldResult;
  /** "unreadable": nothing could be read from the listing page at all. */
  status: "match" | "partial" | "mismatch" | "unreadable";
};

const STREET_WORDS: Record<string, string> = {
  street: "st",
  road: "rd",
  avenue: "ave",
  drive: "dr",
  boulevard: "blvd",
  lane: "ln",
  court: "ct",
  highway: "hwy",
  parkway: "pkwy",
  suite: "ste",
  north: "n",
  south: "s",
  east: "e",
  west: "w",
};
const COMPANY_WORDS = new Set([
  "llc",
  "inc",
  "co",
  "corp",
  "ltd",
  "the",
  "and",
]);

export function normalizePhone(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  // Drop the US/Canada country code so "+1 817…" equals "817…".
  return digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1)
    : digits;
}

export function normalizeName(name: string | null | undefined) {
  return (name ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !COMPANY_WORDS.has(word))
    .join(" ");
}

function normalizeStreet(street: string) {
  return street
    .toLowerCase()
    .replace(/#/g, " ste ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => STREET_WORDS[word] ?? word)
    .join(" ");
}

function splitAddress(address: string) {
  // The zip is the last five-digit number; a street number can have five too.
  const zip =
    [...address.matchAll(/\b(\d{5})(?:-\d{4})?\b/g)].at(-1)?.[1] ?? null;
  const street = normalizeStreet(address.split(",")[0] ?? "");
  return { street, zip };
}

function compareName(reference: string | null, found: string | null) {
  const a = normalizeName(reference);
  const b = normalizeName(found);
  if (!a || !b) return "missing";
  // Listing titles often add a suffix ("… - Fort Worth, TX").
  return a === b || b.includes(a) || a.includes(b) ? "match" : "mismatch";
}

function compareAddress(reference: string | null, found: string | null) {
  if (!reference || !found) return "missing";
  const a = splitAddress(reference);
  const b = splitAddress(found);
  if (!a.street || !b.street) return "missing";
  if (a.zip && b.zip && a.zip !== b.zip) return "mismatch";
  return a.street === b.street ||
    a.street.startsWith(b.street) ||
    b.street.startsWith(a.street)
    ? "match"
    : "mismatch";
}

function comparePhone(reference: string | null, found: string | null) {
  const a = normalizePhone(reference);
  const b = normalizePhone(found);
  if (!a || !b) return "missing";
  return a === b ? "match" : "mismatch";
}

export function compareNap(reference: Nap, found: Nap): NapComparison {
  const name = compareName(reference.name, found.name);
  const address = compareAddress(reference.address, found.address);
  const phone = comparePhone(reference.phone, found.phone);
  const results = [name, address, phone];
  const unreadable = !found.name && !found.address && !found.phone;
  const status = unreadable
    ? "unreadable"
    : results.includes("mismatch")
      ? "mismatch"
      : results.includes("missing")
        ? "partial"
        : "match";
  return { name, address, phone, status };
}
