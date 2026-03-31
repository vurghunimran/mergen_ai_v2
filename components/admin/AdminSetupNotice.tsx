export default function AdminSetupNotice({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: string;
}) {
  return (
    <section className="rounded-[32px] border border-[#f1d4c4] bg-[linear-gradient(135deg,#fff9f4_0%,#ffffff_100%)] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c26b35]">
        Setup needed
      </p>
      <h2 className="mt-3 text-2xl font-bold tracking-[-0.04em] text-slate-900">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{description}</p>
      {action ? (
        <div className="mt-5 rounded-[24px] border border-[#eddccc] bg-white px-5 py-4 text-sm text-slate-700">
          {action}
        </div>
      ) : null}
    </section>
  );
}
