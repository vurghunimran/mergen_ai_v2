"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import SiteLogo from "@/components/SiteLogo";
import PasswordInput from "@/components/ui/password-input";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const invalidLink = searchParams.get("error") === "invalid-link";
  const role = searchParams.get("type") === "community" ? "community" : "client";
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (invalidLink) {
      setChecking(false);
      return;
    }

    let active = true;
    async function checkResetSession() {
      try {
        const { data, error } = await createClient().auth.getUser();
        if (active) setAuthorized(Boolean(data.user && !error));
      } catch {
        if (active) setAuthorized(false);
      } finally {
        if (active) setChecking(false);
      }
    }
    void checkResetSession();
    return () => { active = false; };
  }, [invalidLink]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (password.length < 8) {
      setErrorMessage("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmation) {
      setErrorMessage("The passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      try {
        const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
        setSignOutFailed(Boolean(signOutError));
      } catch {
        setSignOutFailed(true);
      }
      setSuccess(true);
      setPassword("");
      setConfirmation("");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update your password. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(216,90,47,0.1),transparent_24%),linear-gradient(180deg,#fffdf9,#f7f2eb)] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/" aria-label="MERGEN home" className="inline-flex"><SiteLogo /></Link>
        <div className="mx-auto mt-12 max-w-md rounded-[32px] border border-[#ead9cc] bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-9">
          <h1 className="text-3xl font-bold text-slate-900">Set a new password</h1>
          {checking ? (
            <p role="status" className="mt-5 text-sm text-slate-600">Checking your reset link...</p>
          ) : success ? (
            <div role="status" className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-900">
              Password updated. {signOutFailed ? "Please sign out of your current session before logging in again." : "You can now log in with your new password."}
            </div>
          ) : !authorized || invalidLink ? (
            <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
              This reset link is invalid or expired. Request a new link to continue.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700" htmlFor="new-password">New password</label>
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#ead9cc] px-4 py-3 text-base font-normal text-slate-900 outline-none focus:border-[#d85a2f]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700" htmlFor="confirm-password">Confirm new password</label>
                <PasswordInput
                  id="confirm-password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[#ead9cc] px-4 py-3 text-base font-normal text-slate-900 outline-none focus:border-[#d85a2f]"
                />
              </div>
              {errorMessage ? <p role="alert" className="text-sm text-red-700">{errorMessage}</p> : null}
              <button type="submit" disabled={pending} className="w-full rounded-2xl bg-[#d85a2f] px-5 py-3 font-semibold text-white disabled:opacity-60">
                {pending ? "Updating..." : "Update password"}
              </button>
            </form>
          )}

          <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-[#d85a2f]">
            <Link href={`/auth?type=${role}&mode=login`} className="hover:underline">Back to login</Link>
            {(!authorized || invalidLink) && !checking ? <Link href={`/auth/forgot-password?type=${role}`} className="hover:underline">Request a new link</Link> : null}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>;
}
