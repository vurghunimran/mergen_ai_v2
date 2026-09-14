import Link from "next/link";
import SiteLogo from "@/components/SiteLogo";
import SurveyPricingCalculator from "@/components/pricing/SurveyPricingCalculator";
export default function PricingPage() {
  return <main className="min-h-screen bg-[#fffaf4] px-4 py-8 text-[#0f172a] sm:px-8"><div className="mx-auto max-w-5xl">
    <header className="mb-12 flex items-center justify-between"><Link href="/" aria-label="Mergen home"><SiteLogo /></Link><Link href="/auth?type=client" className="rounded-full bg-[#d85a2f] px-5 py-3 text-sm font-semibold text-white">Start a survey</Link></header>
    <h1 className="text-4xl font-bold tracking-tight">Survey pricing</h1><p className="mb-8 mt-4 text-[#475467]">One payment per survey. Choose your question allowance and requested completed responses.</p><SurveyPricingCalculator />
  </div></main>;
}
