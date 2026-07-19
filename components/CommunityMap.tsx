"use client";

import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import type { CommunityMapData } from "@/lib/community-map-data";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const countryCodeAliases: Record<string, string> = {
  "algeria": "DZ",
  "argentina": "AR",
  "armenia": "AM",
  "australia": "AU",
  "azerbaijan": "AZ",
  "bangladesh": "BD",
  "belgium": "BE",
  "bosniaandherz": "BA",
  "brazil": "BR",
  "canada": "CA",
  "centralafricanrep": "CF",
  "chile": "CL",
  "china": "CN",
  "colombia": "CO",
  "czechia": "CZ",
  "czechrepublic": "CZ",
  "demrepcongo": "CD",
  "dominicanrep": "DO",
  "egypt": "EG",
  "eqguinea": "GQ",
  "eswatini": "SZ",
  "ethiopia": "ET",
  "finland": "FI",
  "france": "FR",
  "georgia": "GE",
  "germany": "DE",
  "ghana": "GH",
  "greatbritain": "GB",
  "hongkong": "HK",
  "hongkongsar": "HK",
  "hongkongsarchina": "HK",
  "hungary": "HU",
  "india": "IN",
  "indonesia": "ID",
  "iran": "IR",
  "iraq": "IQ",
  "israel": "IL",
  "japan": "JP",
  "jordan": "JO",
  "kazakhstan": "KZ",
  "kenya": "KE",
  "kyrgyzstan": "KG",
  "lebanon": "LB",
  "malaysia": "MY",
  "macedonia": "MK",
  "mexico": "MX",
  "morocco": "MA",
  "netherlands": "NL",
  "newzealand": "NZ",
  "nigeria": "NG",
  "norway": "NO",
  "pakistan": "PK",
  "philippines": "PH",
  "poland": "PL",
  "republicofkorea": "KR",
  "romania": "RO",
  "russia": "RU",
  "russianfederation": "RU",
  "saudiarabia": "SA",
  "senegal": "SN",
  "serbia": "RS",
  "singapore": "SG",
  "slovenia": "SI",
  "solomonis": "SB",
  "southkorea": "KR",
  "southsudan": "SS",
  "ssudan": "SS",
  "sweden": "SE",
  "taiwan": "TW",
  "tanzania": "TZ",
  "thailand": "TH",
  "turkey": "TR",
  "turkiye": "TR",
  "turkiyeofficial": "TR",
  "uae": "AE",
  "uk": "GB",
  "ukraine": "UA",
  "unitedarabemirates": "AE",
  "unitedkingdom": "GB",
  "unitedstates": "US",
  "unitedstatesofamerica": "US",
  "uruguay": "UY",
  "usa": "US",
  "uzbekistan": "UZ",
  "vietnam": "VN"
};

function normalizeCountryKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function buildCountryCodeMap() {
  const countryCodeMap = new Map<string, string>();

  if (typeof Intl === "undefined" || typeof Intl.DisplayNames !== "function") {
    return countryCodeMap;
  }

  const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (const firstLetter of alphabet) {
    for (const secondLetter of alphabet) {
      const code = `${firstLetter}${secondLetter}`;
      const displayName = displayNames.of(code);

      if (!displayName || displayName === code || displayName === "Unknown Region") {
        continue;
      }

      countryCodeMap.set(normalizeCountryKey(displayName), code);
    }
  }

  for (const [countryKey, code] of Object.entries(countryCodeAliases)) {
    countryCodeMap.set(countryKey, code);
  }

  return countryCodeMap;
}

function colorForMembers(value: number, maxMembers: number) {
  if (value <= 0) return "#e8dcc9";

  const start = [232, 220, 201];
  const end = [157, 61, 24];
  const intensity = Math.min(value / Math.max(maxMembers, 1), 1);

  const channel = (index: number) => Math.round(start[index] + (end[index] - start[index]) * intensity);

  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

function countryFlagEmoji(countryName: string | null, countryCodeMap: Map<string, string>) {
  if (!countryName) return null;

  const code = countryCodeMap.get(normalizeCountryKey(countryName));
  if (!code) return null;

  return code
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

type CommunityMapProps = CommunityMapData;

export default function CommunityMap({
  memberDistribution,
  totalCountries,
  totalMembers,
  maxMembers
}: CommunityMapProps) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  const activeCountry = selectedCountry ?? hoveredCountry;
  const countryCodeMap = useMemo(() => buildCountryCodeMap(), []);

  const activeCount = useMemo(() => {
    if (!activeCountry) return null;
    return memberDistribution[activeCountry] ?? 0;
  }, [activeCountry, memberDistribution]);

  const activeFlag = useMemo(() => countryFlagEmoji(activeCountry, countryCodeMap), [activeCountry, countryCodeMap]);

  return (
    <section id="community-map" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[36px] border border-[#eadfce] bg-[#f8f1e6] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.05)] sm:p-8 lg:p-10">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full border border-[#d85a2f]/20 bg-[#fff0e5] px-4 py-2 text-sm font-semibold text-[#d85a2f]">
            Community regions
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-[-0.04em] text-slate-900 sm:text-4xl">
            A growing community across multiple regions.
          </h2>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <div className="rounded-2xl bg-white px-6 py-4 text-center shadow-sm">
            <p className="text-2xl font-extrabold text-[#d85a2f]">{totalMembers.toLocaleString()}</p>
            <p className="mt-1 text-sm font-medium text-slate-500">Members</p>
          </div>
          <div className="rounded-2xl bg-white px-6 py-4 text-center shadow-sm">
            <p className="text-2xl font-extrabold text-[#d85a2f]">{totalCountries.toLocaleString()}</p>
            <p className="mt-1 text-sm font-medium text-slate-500">Countries</p>
          </div>
        </div>

        <div className="mt-8 flex min-h-[88px] items-center justify-center">
          <div
            className={`flex min-w-[280px] items-center justify-center gap-4 rounded-[24px] border border-[#d85a2f]/15 bg-white/92 px-6 py-4 text-center shadow-sm transition-opacity duration-150 ${
              activeCountry ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <span className="text-3xl leading-none">{activeFlag ?? "🌍"}</span>
            <div>
              <p className="text-base font-bold text-slate-900">{activeCountry ?? ""}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">
                {activeCount !== null ? `${activeCount.toLocaleString()} members` : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-[32px] border border-white/70 bg-[#f4eadb] p-3 shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:p-4">
          <ComposableMap
            projection="geoEqualEarth"
            width={980}
            height={520}
            projectionConfig={{ scale: 165 }}
            className="mx-auto block h-auto w-full max-w-6xl"
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }: { geographies: any[] }) =>
                geographies.map((geo: any) => {
                  const countryName = geo.properties.name as string;
                  const members = memberDistribution[countryName] ?? 0;
                  const active = activeCountry === countryName;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={() => setHoveredCountry(countryName)}
                      onMouseLeave={() => setHoveredCountry(null)}
                      onClick={() => setSelectedCountry((current) => (current === countryName ? null : countryName))}
                      style={{
                        default: {
                          fill: colorForMembers(members, maxMembers),
                          outline: "none",
                          stroke: active ? "#9d3d18" : "#fff8ef",
                          strokeWidth: active ? 1.4 : 0.7,
                          cursor: "pointer"
                        },
                        hover: {
                          fill: colorForMembers(Math.min(members + Math.ceil(maxMembers * 0.12), maxMembers), maxMembers),
                          outline: "none",
                          stroke: "#9d3d18",
                          strokeWidth: 1.1,
                          cursor: "pointer"
                        },
                        pressed: {
                          fill: colorForMembers(Math.min(members + Math.ceil(maxMembers * 0.12), maxMembers), maxMembers),
                          outline: "none",
                          stroke: "#9d3d18",
                          strokeWidth: 1.4,
                          cursor: "pointer"
                        }
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        </div>

        <div className="mt-6 mx-auto max-w-md">
          <div className="h-3 rounded-full bg-[linear-gradient(90deg,#e8dcc9_0%,#f2bc8a_35%,#d85a2f_70%,#9d3d18_100%)]" />
          <div className="mt-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <span>0</span>
            <span>{maxMembers.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
