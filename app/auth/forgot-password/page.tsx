"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import SiteLogo from "@/components/SiteLogo";
import { createClient } from "@/lib/supabase/client";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const role = searchParams.get("type") === "community" ? "community" : "client";
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrorMessage("");

    try {
      const redirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(`/auth/reset-password?type=${role}`)}`;
      const { error } = await createClient().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo
      });
      if (error) throw error;
      setSent(true);
    } catch {
      setErrorMessage("Could not send the reset email right now. Please try again shortly.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(216,90,47,0.1),transparent_24%),linear-gradient(180deg,#fffdf9,#f7f2eb)] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" aria-label="MERGEN home" className="inline-flex"><SiteLogo /></Link>
        <div className="mx-auto mt-12 max-w-md rounded-[32px] border border-[#ead9cc] bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-9">
          <h1 className="text-3xl font-bold text-slate-900">Forgot your password?</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Enter the email you use for MERGEN. We&apos;ll send a link to set a new password.
          </p>

          {sent ? (
            <div role="status" className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-900">
              If an account exists for that email, a password reset link is on its way. Check your inbox and spam folder.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <label className="block text-sm font-semibold text-slate-700" htmlFor="recovery-email">
                Email address
                <input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#ead9cc] px-4 py-3 text-base font-normal text-slate-900 outline-none focus:border-[#d85a2f]"
                />
              </label>
              {errorMessage ? <p role="alert" className="text-sm text-red-700">{errorMessage}</p> : null}
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-2xl bg-[#d85a2f] px-5 py-3 font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          <Link href={`/auth?type=${role}&mode=login`} className="mt-6 inline-block text-sm font-semibold text-[#d85a2f] hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ForgotPasswordPage() {
  return <Suspense><ForgotPasswordForm /></Suspense>;
}
