"use client";

import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const MAX_MEMBERS = 1000;

const memberDistribution: Record<string, number> = {
  "Argentina": 120,
  "Armenia": 65,
  "Australia": 190,
  "Austria": 75,
  "Azerbaijan": 230,
  "Bangladesh": 125,
  "Belgium": 90,
  "Brazil": 200,
  "Canada": 180,
  "Chile": 95,
  "China": 240,
  "Colombia": 140,
  "Denmark": 70,
  "Egypt": 145,
  "France": 210,
  "Georgia": 75,
  "Germany": 190,
  "India": 460,
  "Indonesia": 210,
  "Ireland": 60,
  "Israel": 100,
  "Italy": 165,
  "Japan": 170,
  "Kazakhstan": 90,
  "Kenya": 120,
  "Malaysia": 115,
  "Mexico": 150,
  "Morocco": 110,
  "Netherlands": 130,
  "New Zealand": 60,
  "Nigeria": 155,
  "Norway": 65,
  "Pakistan": 160,
  "Peru": 90,
  "Philippines": 135,
  "Poland": 115,
  "Portugal": 85,
  "Qatar": 70,
  "Romania": 75,
  "Saudi Arabia": 135,
  "Singapore": 95,
  "South Africa": 180,
  "South Korea": 165,
  "Spain": 175,
  "Sweden": 105,
  "Switzerland": 80,
  "Thailand": 140,
  "Turkey": 410,
  "Ukraine": 85,
  "United Arab Emirates": 160,
  "United Kingdom": 220,
  "United States of America": 530,
  "Vietnam": 150
};

const countryFlags: Record<string, string> = {
  "Argentina": "AR",
  "Armenia": "AM",
  "Australia": "AU",
  "Austria": "AT",
  "Azerbaijan": "AZ",
  "Bangladesh": "BD",
  "Belgium": "BE",
  "Brazil": "BR",
  "Canada": "CA",
  "Chile": "CL",
  "China": "CN",
  "Colombia": "CO",
  "Denmark": "DK",
  "Egypt": "EG",
  "France": "FR",
  "Georgia": "GE",
  "Germany": "DE",
  "India": "IN",
  "Indonesia": "ID",
  "Ireland": "IE",
  "Israel": "IL",
  "Italy": "IT",
  "Japan": "JP",
  "Kazakhstan": "KZ",
  "Kenya": "KE",
  "Malaysia": "MY",
  "Mexico": "MX",
  "Morocco": "MA",
  "Netherlands": "NL",
  "New Zealand": "NZ",
  "Nigeria": "NG",
  "Norway": "NO",
  "Pakistan": "PK",
  "Peru": "PE",
  "Philippines": "PH",
  "Poland": "PL",
  "Portugal": "PT",
  "Qatar": "QA",
  "Romania": "RO",
  "Saudi Arabia": "SA",
  "Singapore": "SG",
  "South Africa": "ZA",
  "South Korea": "KR",
  "Spain": "ES",
  "Sweden": "SE",
  "Switzerland": "CH",
  "Thailand": "TH",
  "Turkey": "TR",
  "Ukraine": "UA",
  "United Arab Emirates": "AE",
  "United Kingdom": "GB",
  "United States of America": "US",
  "Vietnam": "VN"
};

function colorForMembers(value: number) {
  if (value <= 0) return "#e8dcc9";

  const start = [232, 220, 201];
  const end = [157, 61, 24];
  const intensity = Math.min(value / MAX_MEMBERS, 1);

  const channel = (index: number) => Math.round(start[index] + (end[index] - start[index]) * intensity);

  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`;
}

function countryFlagEmoji(countryName: string | null) {
  if (!countryName) return null;

  const code = countryFlags[countryName];
  if (!code) return null;

  return code
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export default function CommunityMap() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  const activeCountry = selectedCountry ?? hoveredCountry;

  const activeCount = useMemo(() => {
    if (!activeCountry) return null;
    return memberDistribution[activeCountry] ?? 0;
  }, [activeCountry]);

  const activeFlag = useMemo(() => countryFlagEmoji(activeCountry), [activeCountry]);

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
            <p className="text-2xl font-extrabold text-[#d85a2f]">7000+</p>
            <p className="mt-1 text-sm font-medium text-slate-500">Members</p>
          </div>
          <div className="rounded-2xl bg-white px-6 py-4 text-center shadow-sm">
            <p className="text-2xl font-extrabold text-[#d85a2f]">45+</p>
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
                {activeCount !== null ? `${activeCount.toLocaleString()} respondents` : ""}
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
                          fill: colorForMembers(members),
                          outline: "none",
                          stroke: active ? "#9d3d18" : "#fff8ef",
                          strokeWidth: active ? 1.4 : 0.7,
                          cursor: "pointer"
                        },
                        hover: {
                          fill: colorForMembers(Math.min(members + 120, MAX_MEMBERS)),
                          outline: "none",
                          stroke: "#9d3d18",
                          strokeWidth: 1.1,
                          cursor: "pointer"
                        },
                        pressed: {
                          fill: colorForMembers(Math.min(members + 120, MAX_MEMBERS)),
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
            <span>1000</span>
          </div>
        </div>
      </div>
    </section>
  );
}
