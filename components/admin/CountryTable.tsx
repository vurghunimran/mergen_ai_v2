"use client";
import { useState } from "react";

export default function CountryTable({ countries }: { countries: Array<{ country: string; count: number; joined: number; percentage: number }> }) {
  const [search, setSearch] = useState("");
  const filtered = countries.filter(row => row.country.toLowerCase().includes(search.trim().toLowerCase()));
  return <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-4"><h3 className="text-lg font-semibold text-slate-900">Community by country</h3>
      <label className="sr-only" htmlFor="country-search">Search countries</label><input id="country-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search countries" className="max-w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></div>
    <p className="mt-2 text-sm text-slate-500">All registered community accounts. Missing country information appears as “Not set”.</p>
    <div className="mt-4 max-h-[480px] overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-white text-slate-500"><tr><th scope="col" className="py-3">Country</th><th scope="col" className="px-4 py-3 text-right">Members</th><th scope="col" className="px-4 py-3 text-right">Share</th><th scope="col" className="py-3 text-right">Joined in period</th></tr></thead>
      <tbody>{filtered.map(row => <tr key={row.country} className="border-t border-slate-100"><th scope="row" className="py-3 font-medium text-slate-900">{row.country}</th><td className="px-4 py-3 text-right">{row.count}</td><td className="px-4 py-3 text-right text-slate-500">{row.percentage}%</td><td className="py-3 text-right">{row.joined}</td></tr>)}</tbody></table>
      {!filtered.length ? <p className="py-6 text-sm text-slate-500">{countries.length ? "No countries match your search." : "No community accounts yet."}</p> : null}
    </div>
  </section>;
}
