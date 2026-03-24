import Link from "next/link";
import { ArrowLeft, Clock3, FileText, Shield, Users } from "lucide-react";
import type { ClientSurvey } from "@/lib/dashboard-data";
import {
  buildSignalHighlights,
  getAverageCompletionMinutes,
  getAverageTrustScore,
  getSurveyCompletionRate,
  getSurveyResponseCount
} from "@/lib/survey-report";

export default function ClientSurveyDetails({
  survey,
  userId
}: {
  survey: ClientSurvey;
  userId: string;
}) {
  const completionRate = getSurveyCompletionRate(survey);
  const responseCount = getSurveyResponseCount(survey);
  const averageTrust = getAverageTrustScore(survey);
  const averageMinutes = getAverageCompletionMinutes(survey);
  const highlights = buildSignalHighlights(survey).slice(0, 3);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffaf6_0%,#ffffff_100%)] px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <Link
          href={`/dashboard/client/${userId}`}
          className="inline-flex items-center gap-2 rounded-full border border-[#ffd1ad] bg-white px-4 py-2 text-sm font-semibold text-[#c2410c] shadow-[0_12px_24px_rgba(15,23,42,0.04)] transition hover:border-[#ffb57a]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <section className="overflow-hidden rounded-[32px] border border-[#f5dcc8] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
          <div className="bg-[linear-gradient(115deg,#8b2508_0%,#b93708_20%,#ff5a00_50%,#c33909_78%,#ff6f00_100%)] px-8 py-10 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-100">Survey details</p>
            <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em]">{survey.name}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-orange-50">{survey.description}</p>
          </div>

          <div className="grid gap-4 px-8 py-8 md:grid-cols-4">
            <div className="rounded-[24px] border border-[#f0e3d7] bg-[#fffaf5] p-5">
              <Users className="h-5 w-5 text-[#c2410c]" />
              <p className="mt-4 text-sm text-[#6b7280]">Responses</p>
              <p className="mt-2 text-3xl font-bold text-[#111827]">
                {responseCount}
                <span className="ml-2 text-base font-medium text-[#6b7280]">/ {survey.targetResponses}</span>
              </p>
            </div>
            <div className="rounded-[24px] border border-[#f0e3d7] bg-[#fffaf5] p-5">
              <FileText className="h-5 w-5 text-[#c2410c]" />
              <p className="mt-4 text-sm text-[#6b7280]">Completion</p>
              <p className="mt-2 text-3xl font-bold text-[#111827]">{completionRate}%</p>
            </div>
            <div className="rounded-[24px] border border-[#f0e3d7] bg-[#fffaf5] p-5">
              <Shield className="h-5 w-5 text-[#c2410c]" />
              <p className="mt-4 text-sm text-[#6b7280]">Average trust</p>
              <p className="mt-2 text-3xl font-bold text-[#111827]">{averageTrust}/100</p>
            </div>
            <div className="rounded-[24px] border border-[#f0e3d7] bg-[#fffaf5] p-5">
              <Clock3 className="h-5 w-5 text-[#c2410c]" />
              <p className="mt-4 text-sm text-[#6b7280]">Average time</p>
              <p className="mt-2 text-3xl font-bold text-[#111827]">{averageMinutes.toFixed(1)}m</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-gray-200 bg-white p-7 shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
            <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#7c3412]">Questions</h2>
            <div className="mt-6 space-y-4">
              {(survey.questions ?? []).map((question, index) => (
                <div key={question.id} className="rounded-[22px] border border-[#f0e3d7] bg-[#fffaf5] p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#c2410c]">Question {index + 1}</p>
                  <h3 className="mt-3 text-lg font-semibold text-[#111827]">{question.text}</h3>
                  <p className="mt-2 text-sm text-[#6b7280]">{question.type}</p>
                  {question.options.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {question.options.map((option) => (
                        <span
                          key={`${question.id}-${option}`}
                          className="rounded-full bg-white px-3 py-1 text-sm font-medium text-[#4b5563] ring-1 ring-[#f0e3d7]"
                        >
                          {option}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-gray-200 bg-white p-7 shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
              <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#7c3412]">Research brief</h2>
              <div className="mt-6 space-y-5 text-sm leading-7 text-[#4b5563]">
                <div>
                  <p className="font-semibold text-[#111827]">Created</p>
                  <p>{survey.createdDate}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#111827]">Scope</p>
                  <p>{survey.researchScope || "No explicit scope was saved for this survey."}</p>
                </div>
                <div>
                  <p className="font-semibold text-[#111827]">Hypothesis</p>
                  <p>{survey.hypothesis || "No hypothesis was saved for this survey."}</p>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-gray-200 bg-white p-7 shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
              <h2 className="text-2xl font-bold tracking-[-0.03em] text-[#7c3412]">Signal highlights</h2>
              {highlights.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {highlights.map((highlight) => (
                    <div key={highlight.questionId} className="rounded-[22px] border border-[#f0e3d7] bg-[#fffaf5] p-4">
                      <p className="font-semibold text-[#111827]">{highlight.questionText}</p>
                      <p className="mt-2 text-sm leading-6 text-[#4b5563]">
                        {highlight.answerLabel} leads with {highlight.share}% of validated responses.
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm leading-7 text-[#6b7280]">
                  No validated responses are available yet. Once respondents submit this survey, detailed insight signals will appear here.
                </p>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
