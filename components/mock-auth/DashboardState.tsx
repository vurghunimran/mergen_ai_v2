import Link from "next/link";

type DashboardStateProps = {
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export default function DashboardState({
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel
}: DashboardStateProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(216,90,47,0.12),transparent_22%),linear-gradient(180deg,#fffdf9_0%,#f7f2eb_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center">
        <div className="w-full rounded-[32px] border border-[#eed7ca] bg-white p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)] sm:p-10">
          <span className="inline-flex rounded-full bg-[#fff1e7] px-4 py-2 text-sm font-semibold text-[#d85a2f]">
            Dashboard status
          </span>
          <h1 className="mt-5 text-4xl font-black tracking-[-0.05em] text-slate-900">{title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{description}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={primaryHref}
              className="rounded-full bg-[#d85a2f] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-95"
            >
              {primaryLabel}
            </Link>

            {secondaryHref && secondaryLabel ? (
              <Link
                href={secondaryHref}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#d85a2f] hover:text-[#d85a2f]"
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
