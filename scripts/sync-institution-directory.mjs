import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const HIPO_DATA_URL =
  "https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json";
const ROR_ZENODO_RECORD_URL = "https://zenodo.org/api/records/6347574";
const BATCH_SIZE = 300;
const COUNTRY_NAME_OVERRIDES = new Map([
  ["BO", "Bolivia"],
  ["BN", "Brunei"],
  ["CD", "Democratic Republic of the Congo"],
  ["CG", "Congo"],
  ["CI", "Cote d'Ivoire"],
  ["CV", "Cape Verde"],
  ["CZ", "Czech Republic"],
  ["IR", "Iran"],
  ["KP", "North Korea"],
  ["KR", "South Korea"],
  ["LA", "Laos"],
  ["MD", "Moldova"],
  ["PS", "Palestine"],
  ["RU", "Russia"],
  ["SY", "Syria"],
  ["TZ", "Tanzania"],
  ["TR", "Turkey"],
  ["VE", "Venezuela"],
  ["VN", "Vietnam"],
]);

function loadLocalEnv() {
  const content = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1).replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function normalizeDomain(value) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
}

function normalizeCountryName(name, code) {
  return COUNTRY_NAME_OVERRIDES.get(code?.trim().toUpperCase()) ?? name.trim();
}

function chunks(items, size = BATCH_SIZE) {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Request failed (${response.status}): ${url}`);
  return response.json();
}

async function upsertRecords(supabase, records) {
  let processed = 0;

  for (const batch of chunks(records)) {
    const institutionRows = batch.map((record) => record.institution);
    const { data: saved, error } = await supabase
      .from("institutions")
      .upsert(institutionRows, { onConflict: "source,external_id" })
      .select("id,external_id");

    if (error) throw error;

    const ids = new Map((saved ?? []).map((row) => [row.external_id, row.id]));
    const domainRows = [];
    const aliasRows = [];

    for (const record of batch) {
      const institutionId = ids.get(record.institution.external_id);
      if (!institutionId) continue;

      for (const domain of record.domains) {
        domainRows.push({
          institution_id: institutionId,
          domain,
          source: record.institution.source,
          verified: true,
        });
      }

      for (const alias of record.aliases) {
        aliasRows.push({ institution_id: institutionId, ...alias });
      }
    }

    if (domainRows.length) {
      const { error: domainError } = await supabase
        .from("institution_domains")
        .upsert(domainRows, { onConflict: "institution_id,domain" });
      if (domainError) throw domainError;
    }

    if (aliasRows.length) {
      const { error: aliasError } = await supabase
        .from("institution_aliases")
        .upsert(aliasRows, { onConflict: "institution_id,alias" });
      if (aliasError) throw aliasError;
    }

    processed += batch.length;
    process.stdout.write(`\rSynchronized ${processed}/${records.length} records`);
  }

  process.stdout.write("\n");
}

async function loadHipoRecords() {
  const records = await fetchJson(HIPO_DATA_URL);

  return records
    .filter((record) => record.name && record.country)
    .map((record) => {
      const domains = [...new Set((record.domains ?? []).map(normalizeDomain).filter(Boolean))];
      const externalId = domains[0] || `${record.alpha_two_code ?? "xx"}:${record.name}`;
      return {
        institution: {
          source: "hipo",
          external_id: externalId,
          category: "university",
          name: record.name.trim(),
          country_name: normalizeCountryName(record.country, record.alpha_two_code),
          country_code: record.alpha_two_code?.trim() || null,
          website: record.web_pages?.[0] ?? null,
          organization_types: ["education"],
          verified: true,
          active: true,
        },
        domains,
        aliases: [],
      };
    });
}

async function loadRorRecords() {
  const metadata = await fetchJson(ROR_ZENODO_RECORD_URL);
  const zipFile = (metadata.files ?? []).find((file) => file.key?.endsWith("-ror-data.zip"));
  if (!zipFile?.links?.self) throw new Error("Could not locate the current ROR data dump.");

  const tempDirectory = mkdtempSync(join(tmpdir(), "mergen-ror-"));
  const zipPath = join(tempDirectory, "ror.zip");

  try {
    execFileSync("curl", ["-fsSL", zipFile.links.self, "-o", zipPath], { stdio: "inherit" });
    execFileSync("unzip", ["-q", zipPath, "-d", tempDirectory]);
    const jsonFile = readdirSync(tempDirectory).find((name) => name.endsWith("-ror-data.json"));
    if (!jsonFile) throw new Error("The ROR archive did not contain the expected JSON file.");
    const records = JSON.parse(readFileSync(join(tempDirectory, jsonFile), "utf8"));

    return records.flatMap((record) => {
      const types = record.types ?? [];
      if (record.status !== "active" || types.every((type) => type === "education")) return [];
      const location = record.locations?.[0]?.geonames_details;
      const displayName = record.names?.find((name) => name.types?.includes("ror_display"));
      if (!displayName?.value || !location?.country_name) return [];

      const aliasMap = new Map();
      for (const name of record.names ?? []) {
        const alias = name.value?.trim();
        if (!alias || alias === displayName.value || aliasMap.has(alias)) continue;
        aliasMap.set(alias, { alias, language_code: name.lang ?? null });
      }
      const aliases = [...aliasMap.values()];
      const domains = [...new Set((record.domains ?? []).map(normalizeDomain).filter(Boolean))];
      const website = record.links?.find((link) => link.type === "website")?.value ?? null;

      return [{
        institution: {
          source: "ror",
          external_id: record.id,
          category: "institution",
          name: displayName.value.trim(),
          country_name: normalizeCountryName(location.country_name, location.country_code),
          country_code: location.country_code ?? null,
          website,
          organization_types: types,
          verified: true,
          active: true,
        },
        domains,
        aliases,
      }];
    });
  } finally {
    rmSync(tempDirectory, { recursive: true, force: true });
  }
}

async function main() {
  loadLocalEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase URL and service role key are required.");

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const universitiesOnly = process.argv.includes("--universities-only");
  const institutionsOnly = process.argv.includes("--institutions-only");
  const dryRun = process.argv.includes("--dry-run");

  if (!institutionsOnly) {
    const universities = await loadHipoRecords();
    console.log(`Loaded ${universities.length} university records from Hipo.`);
    if (!dryRun) await upsertRecords(supabase, universities);
  }

  if (!universitiesOnly) {
    const institutions = await loadRorRecords();
    console.log(`Loaded ${institutions.length} research-organization records from ROR.`);
    if (!dryRun) await upsertRecords(supabase, institutions);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
