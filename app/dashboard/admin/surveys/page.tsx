import { Activity, Clock3, FolderKanban, Send, Users2 } from "lucide-react";
import AdminSetupNotice from "@/components/admin/AdminSetupNotice";
import { getAdminSurveyOverview } from "@/lib/admin-dashboard";

export const dynamic = "force-dynamic";

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatDistributionStage(stage: number) {
  return `Stage ${stage}`;
}

function formatPlannedStatus(status: "ready" | "scheduled" | "completed") {
  if (status === "ready") {
    return "Ready now";
  }

  if (status === "scheduled") {
    return "Scheduled";
  }

  return "Completed";
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
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-[28px] border border-white/70 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef1ff] text-[#202a6b]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-slate-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export default async function AdminSurveysPage() {
  try {
    const overview = await getAdminSurveyOverview();

    return (
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Active surveys"
            value={overview.activeSurveyCount}
            description="Currently live surveys that still accept responses."
            icon={Activity}
          />
          <MetricCard
            label="Live responses"
            value={overview.liveResponseCount}
            description="Responses already collected across active surveys."
            icon={Users2}
          />
          <MetricCard
            label="Members sent to"
            value={overview.totalNotificationsSent}
            description="Members who already received survey delivery from the system."
            icon={Send}
          />
          <MetricCard
            label="Active clients"
            value={overview.activeClientCount}
            description="Unique clients with at least one live survey."
            icon={FolderKanban}
          />
          <MetricCard
            label="Expiring soon"
            value={overview.expiringSoonCount}
            description="Active surveys with one day or less remaining."
            icon={Clock3}
          />
        </section>

        <section className="rounded-[32px] border border-white/70 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4153c4]">
                Survey Watchlist
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-900">
                Active survey tracking
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                See who posted each live survey, how long it runs, and how close it is to its
                response goal.
              </p>
            </div>
            <div className="rounded-full bg-[#eef1ff] px-4 py-2 text-sm font-semibold text-[#202a6b]">
              {overview.totalSurveyCount} total surveys in database
            </div>
          </div>

          {overview.activeSurveys.length === 0 ? (
            <div className="mt-6 rounded-[28px] border border-dashed border-slate-200 bg-[#fafbfd] px-6 py-10 text-center text-slate-500">
              No surveys are active right now.
            </div>
          ) : (
            <div className="mt-6 grid gap-5">
              {overview.activeSurveys.map((survey) => (
                <article
                  key={survey.id}
                  className="rounded-[28px] border border-slate-200 bg-[#fcfdff] p-5 shadow-[0_12px_32px_rgba(15,23,42,0.03)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-bold tracking-[-0.04em] text-slate-900">
                          {survey.name}
                        </h3>
                        <span className="rounded-full bg-[#eaf7ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#1d6e42]">
                          {survey.status}
                        </span>
                        <span className="rounded-full bg-[#eef1ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#4153c4]">
                          {survey.situation}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        Posted by <span className="font-semibold text-slate-900">{survey.clientName}</span> (
                        {survey.clientEmail})
                      </p>
                      <p className="text-sm leading-7 text-slate-500">
                        {survey.institution} • {survey.clientCountry}
                      </p>
                    </div>

                    <div className="grid gap-2 rounded-[24px] bg-white px-4 py-4 text-sm text-slate-600 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)] sm:grid-cols-2 lg:min-w-[320px]">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Created
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {formatDateTime(survey.createdAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Expires
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {formatDateTime(survey.expiresAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Duration
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">{survey.durationDays} days</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Time left
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {survey.daysRemaining} day{survey.daysRemaining === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-4">
                    <div className="rounded-[24px] bg-white px-4 py-4 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Responses
                      </p>
                      <p className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-900">
                        {survey.responseCount}
                      </p>
                    </div>
                    <div className="rounded-[24px] bg-white px-4 py-4 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Target
                      </p>
                      <p className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-900">
                        {survey.targetResponses}
                      </p>
                    </div>
                    <div className="rounded-[24px] bg-white px-4 py-4 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Questions
                      </p>
                      <p className="mt-2 text-2xl font-bold tracking-[-0.04em] text-slate-900">
                        {survey.questionCount}
                      </p>
                    </div>
                    <div className="rounded-[24px] bg-white px-4 py-4 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Audience
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
                        {survey.audienceSummary}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-600">
                      <span>Response progress</span>
                      <span>{survey.completionRate}%</span>
                    </div>
                    <div className="h-3 rounded-full bg-[#e9edf8]">
                      <div
                        className="h-3 rounded-full bg-[linear-gradient(90deg,#202a6b_0%,#4c63d2_100%)]"
                        style={{ width: `${survey.completionRate}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_26px_rgba(15,23,42,0.03)]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4153c4]">
                          Delivery log
                        </p>
                        <h4 className="mt-2 text-[20px] font-bold tracking-[-0.03em] text-slate-900">
                          Sent to members
                        </h4>
                        <p className="mt-2 text-sm leading-7 text-slate-500">
                          Every member listed below has already received this survey from the
                          rollout system.
                        </p>
                      </div>
                      <div className="rounded-full bg-[#eef1ff] px-4 py-2 text-sm font-semibold text-[#202a6b]">
                        {survey.notifiedMembersCount} member
                        {survey.notifiedMembersCount === 1 ? "" : "s"} sent
                      </div>
                    </div>

                    {survey.notifiedRecipients.length === 0 ? (
                      <div className="mt-5 rounded-[22px] border border-dashed border-slate-200 bg-[#fafbfd] px-5 py-8 text-center text-sm text-slate-500">
                        No members have been sent this survey yet.
                      </div>
                    ) : (
                      <div className="mt-5 overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-0">
                          <thead>
                            <tr className="text-left text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                              <th className="border-b border-slate-200 pb-4 pr-4">Member</th>
                              <th className="border-b border-slate-200 pb-4 pr-4">Profile</th>
                              <th className="border-b border-slate-200 pb-4 pr-4">Sent</th>
                              <th className="border-b border-slate-200 pb-4">Stage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {survey.notifiedRecipients.map((recipient) => (
                              <tr key={`${survey.id}-${recipient.id}`}>
                                <td className="border-b border-slate-100 py-5 pr-4 align-top">
                                  <p className="font-semibold text-slate-900">{recipient.name}</p>
                                  <p className="mt-1 text-sm text-slate-500">{recipient.email}</p>
                                </td>
                                <td className="border-b border-slate-100 py-5 pr-4 align-top text-sm text-slate-600">
                                  <p>{recipient.country}</p>
                                  <p className="mt-1 text-slate-400">
                                    {recipient.ageSpan} • {recipient.gender}
                                  </p>
                                </td>
                                <td className="border-b border-slate-100 py-5 pr-4 align-top text-sm text-slate-600">
                                  {formatDateTime(recipient.sentAt)}
                                </td>
                                <td className="border-b border-slate-100 py-5 align-top">
                                  <span className="rounded-full bg-[#eef1ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#4153c4]">
                                    {formatDistributionStage(recipient.stage)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_26px_rgba(15,23,42,0.03)]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1d6e42]">
                          Next rollout preview
                        </p>
                        <h4 className="mt-2 text-[20px] font-bold tracking-[-0.03em] text-slate-900">
                          Members planned for the coming send
                        </h4>
                        <p className="mt-2 text-sm leading-7 text-slate-500">
                          This is the current member list the system is planning to send in the next
                          rollout window based on today&apos;s matching rules.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#eaf7ef] px-4 py-2 text-sm font-semibold text-[#1d6e42]">
                          {formatPlannedStatus(survey.plannedStatus)}
                        </span>
                        {survey.plannedStage ? (
                          <span className="rounded-full bg-[#eef1ff] px-4 py-2 text-sm font-semibold text-[#202a6b]">
                            {formatDistributionStage(survey.plannedStage)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-3">
                      <div className="rounded-[22px] bg-[#f8fafc] px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Planned send time
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {survey.plannedFor ? formatDateTime(survey.plannedFor) : "No more sends planned"}
                        </p>
                      </div>
                      <div className="rounded-[22px] bg-[#f8fafc] px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Planned members
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {survey.plannedRecipients.length} member
                          {survey.plannedRecipients.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="rounded-[22px] bg-[#f8fafc] px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                          Status
                        </p>
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                          {formatPlannedStatus(survey.plannedStatus)}
                        </p>
                      </div>
                    </div>

                    {survey.plannedRecipients.length === 0 ? (
                      <div className="mt-5 rounded-[22px] border border-dashed border-slate-200 bg-[#fafbfd] px-5 py-8 text-center text-sm text-slate-500">
                        {survey.plannedStatus === "completed"
                          ? "This survey does not have another planned send stage."
                          : "No members currently qualify for the next planned send."}
                      </div>
                    ) : (
                      <div className="mt-5 overflow-x-auto">
                        <table className="min-w-full border-separate border-spacing-0">
                          <thead>
                            <tr className="text-left text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                              <th className="border-b border-slate-200 pb-4 pr-4">Member</th>
                              <th className="border-b border-slate-200 pb-4 pr-4">Profile</th>
                              <th className="border-b border-slate-200 pb-4">Completions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {survey.plannedRecipients.map((recipient) => (
                              <tr key={`${survey.id}-planned-${recipient.id}`}>
                                <td className="border-b border-slate-100 py-5 pr-4 align-top">
                                  <p className="font-semibold text-slate-900">{recipient.name}</p>
                                  <p className="mt-1 text-sm text-slate-500">{recipient.email}</p>
                                </td>
                                <td className="border-b border-slate-100 py-5 pr-4 align-top text-sm text-slate-600">
                                  <p>{recipient.country}</p>
                                  <p className="mt-1 text-slate-400">
                                    {recipient.ageSpan} • {recipient.gender}
                                  </p>
                                </td>
                                <td className="border-b border-slate-100 py-5 align-top text-sm text-slate-600">
                                  {recipient.completionCount}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load admin survey data.";

    return (
      <AdminSetupNotice
        title="Admin survey data is not ready yet"
        description={message}
        action="Add ADMIN_EMAIL and SUPABASE_SERVICE_ROLE_KEY, then refresh this page."
      />
    );
  }
}
