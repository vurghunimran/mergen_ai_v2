import { Coins, Gift, Globe2, Sparkles, Users2, Wallet } from "lucide-react";
import AdminSetupNotice from "@/components/admin/AdminSetupNotice";
import { getAdminCommunityOverview } from "@/lib/admin-dashboard";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium"
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "No survey credits yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function MetricCard({
  label,
  value,
  description,
  icon: Icon
}: {
  label: string;
  value: string | number;
  description: string;
  icon: typeof Users2;
}) {
  return (
    <div className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff4ea] text-[#d85a2f]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-slate-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function DistributionCard({
  title,
  caption,
  items
}: {
  title: string;
  caption: string;
  items: Array<{ label: string; count: number; percentage: number }>;
}) {
  return (
    <section className="rounded-[30px] border border-white/70 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
      <h2 className="text-xl font-bold tracking-[-0.04em] text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-slate-500">{caption}</p>

      <div className="mt-5 space-y-4">
        {items.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-slate-200 bg-[#fafbfd] px-4 py-6 text-sm text-slate-500">
            No data yet.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.label}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm text-slate-600">
                <span className="font-medium text-slate-900">{item.label}</span>
                <span>
                  {item.count} • {item.percentage}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-[#edf1f7]">
                <div
                  className="h-3 rounded-full bg-[linear-gradient(90deg,#d85a2f_0%,#f1a15f_100%)]"
                  style={{ width: `${Math.max(item.percentage, item.count > 0 ? 6 : 0)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default async function AdminCommunityPage() {
  try {
    const overview = await getAdminCommunityOverview();
    const launchProgress =
      overview.launchCapacity > 0 ? Math.round((overview.totalMembers / overview.launchCapacity) * 100) : 0;

    return (
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <MetricCard
            label="Community members"
            value={overview.totalMembers}
            description="All registered community accounts available for survey matching."
            icon={Users2}
          />
          <MetricCard
            label="Launch progress"
            value={`${launchProgress}%`}
            description={`${overview.totalMembers} of ${overview.launchCapacity} planned first-stage members.`}
            icon={Globe2}
          />
          <MetricCard
            label="Available credits"
            value={overview.totalAvailableCredits}
            description="Credits members earned and have still not used for rewards."
            icon={Coins}
          />
          <MetricCard
            label="Reward activations"
            value={overview.totalRewardActivations}
            description="Activated rewards recorded in the redemption ledger."
            icon={Gift}
          />
          <MetricCard
            label="Redeemed credits"
            value={overview.totalRedeemedCredits}
            description="Credits already consumed through rewards."
            icon={Wallet}
          />
          <MetricCard
            label="Average trust"
            value={`${overview.averageTrustScore}%`}
            description="Average trust score across all submitted survey responses."
            icon={Sparkles}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <DistributionCard
            title="Countries"
            caption="Where current members are located."
            items={overview.countries}
          />
          <DistributionCard
            title="Regions"
            caption="How your launch is spreading across the first-stage map."
            items={overview.regions}
          />
          <DistributionCard
            title="Age groups"
            caption="Community age distribution from member profiles."
            items={overview.ages}
          />
          <DistributionCard
            title="Gender"
            caption="Gender mix across signed-up community members."
            items={overview.genders}
          />
          <DistributionCard
            title="Interests"
            caption="Most common preference signals captured during sign-up."
            items={overview.interests}
          />
          <DistributionCard
            title="Reward demand"
            caption="Which reward partners are being activated most often."
            items={overview.rewards}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-[30px] border border-white/70 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.04)] xl:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d85a2f]">
                  Credit Watch
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-900">
                  Members with unused credits
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  Track which members earned credits yesterday or in recent days and still have
                  those credits available for reward redemption.
                </p>
              </div>
              <div className="rounded-full bg-[#fff4ea] px-4 py-2 text-sm font-semibold text-[#a84724]">
                {overview.membersWithAvailableCredits} member
                {overview.membersWithAvailableCredits === 1 ? "" : "s"} with credits left
              </div>
            </div>

            {overview.creditBalances.length === 0 ? (
              <div className="mt-6 rounded-[22px] border border-dashed border-slate-200 bg-[#fafbfd] px-5 py-8 text-center text-sm text-slate-500">
                No members currently have unused credits.
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0">
                  <thead>
                    <tr className="text-left text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      <th className="border-b border-slate-200 pb-4 pr-4">Member</th>
                      <th className="border-b border-slate-200 pb-4 pr-4">Country</th>
                      <th className="border-b border-slate-200 pb-4 pr-4">Available</th>
                      <th className="border-b border-slate-200 pb-4 pr-4">Yesterday</th>
                      <th className="border-b border-slate-200 pb-4 pr-4">Last 7 days</th>
                      <th className="border-b border-slate-200 pb-4 pr-4">Lifetime</th>
                      <th className="border-b border-slate-200 pb-4">Last earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.creditBalances.map((member) => (
                      <tr key={`credit-${member.id}`}>
                        <td className="border-b border-slate-100 py-5 pr-4 align-top">
                          <p className="font-semibold text-slate-900">{member.name}</p>
                          <p className="mt-1 text-sm text-slate-500">{member.email}</p>
                        </td>
                        <td className="border-b border-slate-100 py-5 pr-4 align-top text-sm text-slate-600">
                          <p>{member.country}</p>
                          <p className="mt-1 text-slate-400">
                            {member.ageSpan} • {member.gender}
                          </p>
                        </td>
                        <td className="border-b border-slate-100 py-5 pr-4 align-top text-sm font-semibold text-slate-900">
                          {member.availableCredits}
                        </td>
                        <td className="border-b border-slate-100 py-5 pr-4 align-top text-sm text-slate-600">
                          {member.creditsEarnedYesterday}
                        </td>
                        <td className="border-b border-slate-100 py-5 pr-4 align-top text-sm text-slate-600">
                          {member.creditsEarnedLast7Days}
                        </td>
                        <td className="border-b border-slate-100 py-5 pr-4 align-top text-sm text-slate-600">
                          <p>Earned {member.earnedCredits}</p>
                          <p className="mt-1 text-slate-400">Redeemed {member.redeemedCredits}</p>
                        </td>
                        <td className="border-b border-slate-100 py-5 align-top text-sm text-slate-600">
                          {formatDateTime(member.lastEarnedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-[30px] border border-white/70 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d85a2f]">
                  Member Snapshot
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-900">
                  Recent community members
                </h2>
              </div>
              <div className="rounded-full bg-[#fff4ea] px-4 py-2 text-sm font-semibold text-[#a84724]">
                {overview.totalClients} client account{overview.totalClients === 1 ? "" : "s"} also registered
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    <th className="border-b border-slate-200 pb-4 pr-4">Member</th>
                    <th className="border-b border-slate-200 pb-4 pr-4">Country</th>
                    <th className="border-b border-slate-200 pb-4 pr-4">Profile</th>
                    <th className="border-b border-slate-200 pb-4 pr-4">Credits</th>
                    <th className="border-b border-slate-200 pb-4">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recentMembers.map((member) => (
                    <tr key={member.id}>
                      <td className="border-b border-slate-100 py-5 pr-4 align-top">
                        <p className="font-semibold text-slate-900">{member.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{member.email}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-400">
                          {member.interests.slice(0, 2).join(" • ") || "No interests yet"}
                        </p>
                      </td>
                      <td className="border-b border-slate-100 py-5 pr-4 align-top text-sm text-slate-600">
                        <p>{member.country}</p>
                      </td>
                      <td className="border-b border-slate-100 py-5 pr-4 align-top text-sm text-slate-600">
                        <p>{member.ageSpan}</p>
                        <p className="mt-1 text-slate-400">{member.gender}</p>
                      </td>
                      <td className="border-b border-slate-100 py-5 pr-4 align-top text-sm text-slate-600">
                        <p>Available {member.availableCredits}</p>
                        <p className="mt-1 text-slate-400">
                          Earned {member.earnedCredits} • Redeemed {member.redeemedCredits}
                        </p>
                        <p className="mt-1 text-slate-400">
                          Yesterday {member.creditsEarnedYesterday} • 7 days {member.creditsEarnedLast7Days}
                        </p>
                        <p className="mt-1 text-slate-400">{member.completionCount} completion(s)</p>
                      </td>
                      <td className="border-b border-slate-100 py-5 align-top text-sm text-slate-600">
                        {formatDate(member.joinedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/70 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d85a2f]">
              Reward Ledger
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-900">
              Recent reward activations
            </h2>
            <div className="mt-5 space-y-4">
              {overview.recentRewardActivations.length === 0 ? (
                <div className="rounded-[22px] border border-dashed border-slate-200 bg-[#fafbfd] px-4 py-6 text-sm text-slate-500">
                  No rewards have been activated yet.
                </div>
              ) : (
                overview.recentRewardActivations.map((activation) => (
                  <div
                    key={activation.id}
                    className="rounded-[22px] border border-slate-200 bg-[#fcfdff] px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">{activation.rewardCompany}</p>
                        <p className="text-sm text-slate-500">{activation.rewardSubtitle}</p>
                      </div>
                      <div className="rounded-full bg-[#fff4ea] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#a84724]">
                        {activation.status}
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-slate-700">{activation.memberName}</p>
                    <p className="text-sm text-slate-500">{activation.memberEmail}</p>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                      <span>{activation.credits} credits</span>
                      <span>{formatDate(activation.activatedAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load admin community data.";

    return (
      <AdminSetupNotice
        title="Admin community analytics are not ready yet"
        description={message}
        action="Run the new reward activation migration and confirm your service-role environment variables are available to the app."
      />
    );
  }
}
