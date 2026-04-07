"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import SurveyAttachmentShowcase from "@/components/dashboard/SurveyAttachmentShowcase";
import SiteLogo from "@/components/SiteLogo";
import {
  SURVEY_PREVIEW_STORAGE_KEY,
  type StoredSurveyQuestion,
  type SurveyPreviewPayload
} from "@/lib/dashboard-data";
import { parseSurveyAttachments } from "@/lib/survey-attachments";

function renderQuestionOptions(question: StoredSurveyQuestion) {
  if (question.type === "Open question") {
    return (
      <textarea
        disabled
        rows={4}
        placeholder="Type your answer here..."
        className="min-h-[120px] w-full rounded-[18px] border border-dashed border-[#d0d5dd] bg-[#fcfcfd] px-4 py-4 text-[15px] text-[#98a2b3]"
      />
    );
  }

  if (question.type === "Likert scale") {
    return (
      <div className="grid gap-3 md:grid-cols-5">
        {question.options.map((option) => (
          <div key={option} className="rounded-2xl bg-[#fcfcfd] px-3 py-4 text-center text-sm font-semibold text-[#475467]">
            {option}
          </div>
        ))}
      </div>
    );
  }

  if (question.type === "Rating scale") {
    return (
      <div className="flex flex-wrap gap-3">
        {question.options.map((option) => (
          <div
            key={option}
            className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[#fcfcfd] text-sm font-semibold text-[#d85d1c]"
          >
            {option}
          </div>
        ))}
      </div>
    );
  }

  if (question.type === "Ranking") {
    return (
      <div className="grid gap-3">
        {question.options.map((option, index) => (
          <div key={option} className="flex items-center gap-3 rounded-2xl bg-[#fcfcfd] px-4 py-3 text-[15px] text-[#475467]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#fff3e7] text-[13px] font-bold text-[#d85d1c]">
              {index + 1}
            </span>
            <span>{option}</span>
          </div>
        ))}
      </div>
    );
  }

  const inputType = question.type === "Multiple choice" ? "checkbox" : "radio";

  return (
    <div className="grid gap-3">
      {question.options.map((option) => (
        <label key={option} className="flex items-center gap-3 rounded-2xl bg-[#fcfcfd] px-4 py-3 text-[15px] text-[#475467]">
          <input type={inputType} disabled />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

export default function SurveyPreviewPage() {
  const [preview, setPreview] = useState<SurveyPreviewPayload | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    try {
      const rawPreview = window.localStorage.getItem(SURVEY_PREVIEW_STORAGE_KEY);

      if (rawPreview) {
        const parsedPreview = JSON.parse(rawPreview) as SurveyPreviewPayload;

        if (parsedPreview && Array.isArray(parsedPreview.questions)) {
          const draftAttachments =
            parsedPreview.draftStorageKey && typeof window !== "undefined"
              ? parseSurveyAttachments(
                  JSON.parse(window.localStorage.getItem(parsedPreview.draftStorageKey) ?? "null")?.draft?.attachments
                )
              : undefined;

          setPreview({
            ...parsedPreview,
            attachments: parsedPreview.attachments ?? draftAttachments
          });
        }
      }
    } catch {
      setPreview(null);
    } finally {
      setHasLoaded(true);
    }
  }, []);

  if (!hasLoaded) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#fffaf6_0%,#ffffff_100%)] px-6 py-16">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-gray-200 bg-white p-8 text-center shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
          <p className="text-[16px] text-[#667085]">Loading preview...</p>
        </div>
      </main>
    );
  }

  if (!preview) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#fffaf6_0%,#ffffff_100%)] px-6 py-16">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-gray-200 bg-white p-8 text-center shadow-[0_18px_44px_rgba(15,23,42,0.04)]">
          <h1 className="text-[28px] font-bold tracking-[-0.03em] text-[#7c3412]">Preview unavailable</h1>
          <p className="mt-3 text-[16px] leading-7 text-[#667085]">
            No survey preview is stored in this browser yet. Return to the survey builder and click Preview again.
          </p>
          <Link
            href="/dashboard/client?section=create-survey"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#4b5563] transition hover:border-[#ffd1ad] hover:text-[#d85d1c]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Builder
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffaf6_0%,#ffffff_100%)] px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Link
            href="/dashboard/client?section=create-survey"
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-[#4b5563] shadow-[0_12px_24px_rgba(15,23,42,0.04)] transition hover:border-[#ffd1ad] hover:text-[#d85d1c]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Builder
          </Link>
        </div>

        <div className="mb-10 flex flex-col items-center justify-center text-center">
          <SiteLogo label="MERGEN AI" markClassName="h-11" textClassName="mt-4 text-[15px] font-bold tracking-[0.18em] text-[#d85d1c]" />
          <h1 className="mt-8 text-[40px] font-bold tracking-[-0.04em] text-[#7c3412]">{preview.title}</h1>
          <p className="mt-3 max-w-3xl text-[16px] leading-7 text-[#667085]">{preview.subtitle}</p>
        </div>

        <SurveyAttachmentShowcase
          attachments={preview.attachments}
          title="Preview attached materials"
          description="These optional attachments will be visible to community members before they start the survey."
          tone="orange"
          className="mb-6"
        />

        <div className="grid gap-5">
          {preview.questions.map((question, index) => (
            <section
              key={question.id}
              className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_18px_44px_rgba(15,23,42,0.04)]"
            >
              <div className="inline-flex rounded-full bg-[#fff3e7] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#d85d1c]">
                Question {index + 1}
              </div>
              <h2 className="mt-4 text-[20px] font-semibold leading-8 text-[#101828]">{question.text}</h2>
              <p className="mt-2 text-[13px] font-bold uppercase tracking-[0.1em] text-[#98a2b3]">{question.type}</p>
              <div className="mt-5">{renderQuestionOptions(question)}</div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
