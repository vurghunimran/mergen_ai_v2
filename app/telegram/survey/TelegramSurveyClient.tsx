"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { StoredSurveyQuestion, SurveyAnswerMap } from "@/lib/dashboard-data";
import { buildSurveySubmissionAnswers } from "@/lib/trust-score";

declare global { interface Window { Telegram?: { WebApp?: { initData: string; ready(): void; expand(): void; close(): void; themeParams?: Record<string, string> } } } }

type Payload = { survey: { id: number; name: string; description: string }; questions: StoredSurveyQuestion[]; answers: SurveyAnswerMap; startedAt: string | null };

export default function TelegramSurveyClient() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [answers, setAnswers] = useState<SurveyAnswerMap>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ earnedCredits: number; summary: string } | null>(null);
  const startedAt = useRef(Date.now());
  const token = useMemo(() => typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("token") || "", []);
  const initData = () => window.Telegram?.WebApp?.initData || "";

  useEffect(() => {
    window.Telegram?.WebApp?.ready(); window.Telegram?.WebApp?.expand();
    fetch(`/api/telegram/survey?token=${encodeURIComponent(token)}`, { headers: { "x-telegram-init-data": initData() } })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; })
      .then((data: Payload) => { setPayload(data); setAnswers(data.answers || {}); if (data.startedAt) startedAt.current = new Date(data.startedAt).getTime(); })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not open this survey."));
  }, [token]);

  function update(questionId: string, value: string | string[]) { setAnswers((current) => ({ ...current, [questionId]: value })); }
  async function saveProgress() {
    setSaving(true); setError("");
    const response = await fetch("/api/telegram/survey", { method: "PATCH", headers: { "Content-Type": "application/json", "x-telegram-init-data": initData() }, body: JSON.stringify({ token, answers }) });
    const data = await response.json(); if (!response.ok) setError(data.error); setSaving(false);
  }
  async function submit() {
    if (!payload) return;
    setSaving(true); setError("");
    const response = await fetch("/api/telegram/survey", { method: "POST", headers: { "Content-Type": "application/json", "x-telegram-init-data": initData() }, body: JSON.stringify({ token, answers: buildSurveySubmissionAnswers(payload.questions, answers), completionTimeSeconds: Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)) }) });
    const data = await response.json(); if (!response.ok) setError(data.error); else setResult(data); setSaving(false);
  }

  if (error && !payload) return <main className="min-h-screen bg-[#fff8f1] p-6 text-[#172033]"><div className="mx-auto mt-16 max-w-md rounded-3xl bg-white p-7 shadow-xl"><h1 className="text-xl font-bold">Survey unavailable</h1><p className="mt-3 text-slate-600">{error}</p></div></main>;
  if (!payload) return <main className="flex min-h-screen items-center justify-center bg-[#fff8f1] text-[#172033]">Loading survey…</main>;
  if (result) return <main className="min-h-screen bg-[#fff8f1] p-6 text-[#172033]"><div className="mx-auto mt-12 max-w-md rounded-3xl bg-white p-8 text-center shadow-xl"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#fff0e4] text-3xl text-[#f35a0a]">✓</div><h1 className="text-2xl font-extrabold">Response submitted</h1><p className="mt-3 text-slate-600">{result.summary}</p><p className="mt-5 font-bold text-[#f35a0a]">+{result.earnedCredits} credits</p><button onClick={() => window.Telegram?.WebApp?.close()} className="mt-7 w-full rounded-2xl bg-[#172033] px-5 py-4 font-bold text-white">Close</button></div></main>;

  return <main className="min-h-screen bg-[#fff8f1] px-4 py-6 text-[#172033]"><div className="mx-auto max-w-xl"><div className="mb-5 rounded-3xl bg-[#172033] p-6 text-white shadow-xl"><span className="text-sm font-bold uppercase tracking-[.18em] text-[#ff7a32]">MERGEN AI</span><h1 className="mt-3 text-2xl font-extrabold">{payload.survey.name}</h1><p className="mt-2 text-sm leading-6 text-slate-300">{payload.survey.description}</p><div className="mt-4 text-sm text-slate-300">{payload.questions.length} questions · progress saved securely</div></div>
  <div className="space-y-4">{payload.questions.map((question, index) => <section key={question.id} className="rounded-3xl bg-white p-5 shadow-sm"><p className="mb-4 font-bold"><span className="mr-2 text-[#f35a0a]">{index + 1}.</span>{question.text}</p><QuestionField question={question} value={answers[question.id]} onChange={(value) => update(question.id, value)} /></section>)}</div>
  {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}<div className="sticky bottom-0 mt-5 flex gap-3 bg-[#fff8f1]/95 py-4 backdrop-blur"><button disabled={saving} onClick={saveProgress} className="flex-1 rounded-2xl border border-[#f35a0a] px-4 py-4 font-bold text-[#f35a0a]">Save</button><button disabled={saving} onClick={submit} className="flex-[1.5] rounded-2xl bg-[#f35a0a] px-4 py-4 font-bold text-white shadow-lg disabled:opacity-50">{saving ? "Please wait…" : "Submit survey"}</button></div></div></main>;
}

function QuestionField({ question, value, onChange }: { question: StoredSurveyQuestion; value?: string | string[]; onChange: (value: string | string[]) => void }) {
  if (question.type === "Open question") return <textarea value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} rows={4} className="w-full rounded-2xl border border-slate-200 p-4 outline-none focus:border-[#f35a0a]" placeholder="Type your answer" />;
  const options = question.type === "Yes / No" ? ["Yes", "No"] : question.type === "Likert scale" ? ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"] : question.type === "Rating scale" && question.options.length === 0 ? ["1", "2", "3", "4", "5"] : question.options;
  const multiple = question.type === "Multiple choice" || question.type === "Ranking";
  return <div className="space-y-2">{options.map((option) => { const selected = multiple ? Array.isArray(value) && value.includes(option) : value === option; return <button type="button" key={option} onClick={() => multiple ? onChange(selected ? (value as string[]).filter((item) => item !== option) : [...(Array.isArray(value) ? value : []), option]) : onChange(option)} className={`w-full rounded-2xl border p-3 text-left text-sm font-medium ${selected ? "border-[#f35a0a] bg-[#fff3ea] text-[#d94b00]" : "border-slate-200 bg-white"}`}>{option}</button>; })}</div>;
}
