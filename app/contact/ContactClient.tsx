"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import AutoDismissNotice from "@/components/ui/auto-dismiss-notice";

type ContactForm = {
  fullName: string;
  email: string;
  purpose: string;
  message: string;
};

const purposeOptions = [
  "General Inquiry",
  "Business Partnership",
  "University Cooperation",
  "Technical Support",
  "Other"
];

export default function ContactClient({ initialPurpose }: { initialPurpose: string }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset } = useForm<ContactForm>({
    defaultValues: {
      purpose: initialPurpose
    }
  });

  const onSubmit = async (data: ContactForm) => {
    setLoading(true);
    setSent(false);
    setError(false);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      setSent(true);
      reset({
        fullName: "",
        email: "",
        purpose: initialPurpose,
        message: ""
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="rounded-[34px] border border-white/70 bg-[linear-gradient(135deg,#10203a_0%,#1f3655_48%,#d85a2f_180%)] p-8 text-white shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/70">Contact</p>
            <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl">Tell us what you need.</h1>
            <p className="mt-5 max-w-md text-base leading-8 text-white/80">
              Write your inquiry, leave your email address, choose the purpose, and the form will send your message to
              the MERGEN team directly.
            </p>

            <div className="mt-8 rounded-[26px] border border-white/10 bg-white/10 p-5">
              <p className="text-sm font-bold text-white">Good for</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-white/75">
                <li>Business or research partnership requests</li>
                <li>Support questions and platform issues</li>
                <li>University cooperation and pilot studies</li>
              </ul>
            </div>
          </div>

          <section className="rounded-[34px] border border-white/70 bg-white/85 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.07)] backdrop-blur sm:p-8">
            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Full name</label>
                <input
                  {...register("fullName", { required: true })}
                  placeholder="Your name"
                  className="w-full rounded-2xl border border-slate-200 bg-[#fbf7f2] px-4 py-3 text-slate-900 outline-none ring-[#d85a2f] transition focus:ring-2"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email address</label>
                <input
                  {...register("email", { required: true })}
                  type="email"
                  placeholder="your@email.com"
                  className="w-full rounded-2xl border border-slate-200 bg-[#fbf7f2] px-4 py-3 text-slate-900 outline-none ring-[#d85a2f] transition focus:ring-2"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Purpose of inquiry</label>
                <select
                  {...register("purpose", { required: true })}
                  className="w-full rounded-2xl border border-slate-200 bg-[#fbf7f2] px-4 py-3 text-slate-900 outline-none ring-[#d85a2f] transition focus:ring-2"
                >
                  {purposeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Message</label>
                <textarea
                  {...register("message", { required: true })}
                  rows={7}
                  placeholder="Write your inquiry or problem here"
                  className="w-full rounded-2xl border border-slate-200 bg-[#fbf7f2] px-4 py-3 text-slate-900 outline-none ring-[#d85a2f] transition focus:ring-2"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex rounded-2xl bg-[#d85a2f] px-6 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(216,90,47,0.18)] transition hover:bg-[#bf4c25] disabled:opacity-70"
              >
                {loading ? "Sending..." : "Send inquiry"}
              </button>

              {sent ? (
                <AutoDismissNotice
                  message="Your message has been sent. We'll reply to your email soon."
                  tone="success"
                  variant="inline"
                  onDismiss={() => setSent(false)}
                  noticeKey="contact-sent"
                />
              ) : null}
              {error ? (
                <AutoDismissNotice
                  message="Message sending failed. Please try again."
                  tone="error"
                  variant="inline"
                  onDismiss={() => setError(false)}
                  noticeKey="contact-error"
                />
              ) : null}
            </form>
          </section>
        </section>
      </div>
    </main>
  );
}
