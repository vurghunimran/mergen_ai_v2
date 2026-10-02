import Link from "next/link";
import { communityRewardCountries } from "@/lib/community-reward-countries";
import { isTremendousSandboxConfigured, listTremendousSandboxProducts, type TremendousSandboxProduct } from "@/lib/tremendous-sandbox";

export const dynamic = "force-dynamic";

const productGroups = [
  { label: "Digital gift cards", categories: new Set<string>(["merchant_card"]) },
  { label: "Virtual prepaid cards", categories: new Set<string>(["visa_card"]) },
  { label: "Cash and wallet payouts", categories: new Set<string>(["ach", "international_bank", "instant_debit_transfer", "paypal", "venmo", "cash_app", "wallet"]) },
  { label: "Donations", categories: new Set<string>(["charity"]) }
] as const;

function ProductList({ products }: { products: TremendousSandboxProduct[] }) {
  if (products.length === 0) return <p className="mt-3 text-sm text-slate-500">None listed for this country.</p>;
  return (
    <>
      <p className="mt-1 text-sm text-slate-500">{products.length} candidate{products.length === 1 ? "" : "s"}</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {products.slice(0, 16).map((product) => (
          <li key={product.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <p className="font-medium">{product.name}</p>
            <p className="mt-1 text-xs text-slate-500">{product.currencyCodes.join(", ") || "Currency not supplied"}</p>
            <p className="mt-1 text-xs text-slate-500">
              Amounts: {product.denominations.length > 0
                ? product.denominations.map((sku) => `${sku.min}–${sku.max} ${sku.currencyCode || "currency unspecified"}`).join("; ")
                : "not supplied"}
            </p>
          </li>
        ))}
      </ul>
      {products.length > 16 ? <p className="mt-3 text-xs text-slate-500">Showing 16 of {products.length}. Use the full catalog link for the rest.</p> : null}
    </>
  );
}

export default async function AdminRewardCatalogPage({
  searchParams
}: {
  searchParams?: Promise<{ country?: string }>;
}) {
  const requestedCode = (await searchParams)?.country?.toUpperCase() ?? "AZ";
  const country = communityRewardCountries.find((entry) => entry.code === requestedCode) ?? communityRewardCountries.find((entry) => entry.code === "AZ")!;
  const configured = isTremendousSandboxConfigured();
  const result = configured
    ? await listTremendousSandboxProducts(country.code).then((products) => ({ products, error: false })).catch(() => ({ products: [] as TremendousSandboxProduct[], error: true }))
    : { products: [] as TremendousSandboxProduct[], error: false };
  const products = result.products.filter((product) => product.countries.includes(country.code));

  return (
    <section className="space-y-6 rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_24px_65px_rgba(15,23,42,0.06)] sm:p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4153c4]">Tremendous sandbox</p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-900">Country reward menu</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Review provider products for each of MERGEN’s {communityRewardCountries.length} community countries. Catalog presence is only a candidate: confirm access, denomination, fees, and recipient experience before offering a reward to members.
        </p>
      </div>

      <form action="/dashboard/admin/rewards" className="flex flex-wrap items-end gap-3">
        <label className="text-sm font-medium text-slate-800" htmlFor="reward-country">Member country</label>
        <select id="reward-country" name="country" defaultValue={country.code} className="min-w-56 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900">
          {communityRewardCountries.map((entry) => <option key={entry.code} value={entry.code}>{entry.name}</option>)}
        </select>
        <button type="submit" className="rounded-xl bg-[#4f46e5] px-4 py-2 text-sm font-semibold text-white">View products</button>
        <Link href={`/api/admin/rewards/tremendous-catalog?country=${country.code}`} className="text-sm font-medium text-[#4153c4] underline">Full catalog JSON</Link>
      </form>

      {!configured ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
          Add a server-only <code>TREMENDOUS_SANDBOX_API_KEY</code> beginning with <code>TEST_</code> to load live sandbox candidates. Member redemption remains closed.
        </div>
      ) : result.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">The sandbox catalog could not be loaded. Check the key and provider connection.</div>
      ) : null}

      {configured && !result.error ? (
        <div className="space-y-5">
          <p className="text-sm text-slate-600">{products.length} products currently listed for {country.name}.</p>
          {productGroups.map((group) => (
            <div key={group.label} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold text-slate-900">{group.label}</h3>
              <ProductList products={products.filter((product) => group.categories.has(product.category))} />
            </div>
          ))}
        </div>
      ) : null}

      <p className="text-sm text-slate-600">Sandbox test valuation: 500 MERGEN credits = $5. Local currency conversion can make a $5 reward ineligible for a particular gift card. Live credit pricing and member redemption remain unset.</p>
    </section>
  );
}
