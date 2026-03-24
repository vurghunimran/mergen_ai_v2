import type { PublicMockUser } from "@/lib/mock-auth/mock-users";

type UserDashboardProps = {
  user: PublicMockUser;
};

export default function UserDashboard({ user }: UserDashboardProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(216,90,47,0.12),transparent_20%),radial-gradient(circle_at_top_right,rgba(123,147,178,0.16),transparent_24%),linear-gradient(180deg,#fffdf9_0%,#f7f2eb_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d85a2f]">
                Protected dashboard
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] text-slate-900">{user.name}</h1>
              <p className="mt-3 text-base text-slate-600">
                {user.role} · {user.team}
              </p>
              <p className="mt-2 font-mono text-sm text-slate-500">/dashboard/{user.id}</p>
            </div>

            <form action="/api/mock-auth/logout" method="POST">
              <button
                type="submit"
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#d85a2f] hover:text-[#d85a2f]"
              >
                Log out
              </button>
            </form>
          </div>

          <div className="mt-8 rounded-[28px] border border-[#eed7ca] bg-[#fff8f3] px-6 py-5">
            <p className="text-lg font-bold text-slate-900">{user.dashboard.headline}</p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{user.dashboard.description}</p>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {user.dashboard.metrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)]"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">{metric.label}</p>
              <p className="mt-4 text-4xl font-black tracking-[-0.05em] text-slate-900">{metric.value}</p>
              <p className="mt-3 text-sm text-slate-600">{metric.helper}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)] sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Priority list</p>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-900">What needs attention next</h2>
            <div className="mt-6 space-y-4">
              {user.dashboard.priorities.map((item, index) => (
                <div key={item} className="flex items-start gap-4 rounded-[24px] bg-slate-50 px-4 py-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff1e7] text-sm font-bold text-[#d85a2f]">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-7 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)] sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Recent activity</p>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-900">Latest updates for this user</h2>
            <div className="mt-6 space-y-4">
              {user.dashboard.recentActivity.map((activity) => (
                <div key={`${activity.title}-${activity.time}`} className="rounded-[24px] border border-slate-200 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-base font-bold text-slate-900">{activity.title}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{activity.detail}</p>
                    </div>
                    <span className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {activity.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
