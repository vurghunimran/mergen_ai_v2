"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import AutoDismissNotice from "@/components/ui/auto-dismiss-notice";
import PasswordInput from "@/components/ui/password-input";

type DemoUser = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  team: string;
};

type LoginFormProps = {
  demoUsers: DemoUser[];
  redirectedFromDashboard?: boolean;
};

type LoginResponse = {
  error?: string;
  redirectTo?: string;
};

export default function LoginForm({ demoUsers, redirectedFromDashboard = false }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(demoUsers[0]?.email ?? "");
  const [password, setPassword] = useState(demoUsers[0]?.password ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/mock-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const payload = (await response.json().catch(() => ({}))) as LoginResponse;

      if (!response.ok || !payload.redirectTo) {
        setError(payload.error ?? "Login failed. Please try again.");
        return;
      }

      router.replace(payload.redirectTo);
      router.refresh();
    } catch {
      setError("Unable to reach the login service right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-[32px] border border-[#eed7ca] bg-[#fff8f3] p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
        <div className="max-w-lg">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#d85a2f]">
            Next.js 14 + App Router
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-slate-900">
            Mock login flow with protected dashboard routes.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Sign in with one of the demo accounts. Successful login stores a mock session cookie and
            redirects to a user-specific dashboard at `/dashboard/:id`.
          </p>

          <div className="mt-8 rounded-[24px] border border-[#edd8cd] bg-white px-5 py-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">What this example includes</p>
            <ul className="mt-3 space-y-2">
              <li>Login form and redirect logic after successful authentication</li>
              <li>Protected dashboard route that requires a valid session</li>
              <li>User-specific dashboard data based on the `id` route param</li>
              <li>Friendly error states for missing users or unauthorized access</li>
            </ul>
          </div>

          {redirectedFromDashboard ? (
            <div className="mt-6 rounded-[24px] border border-[#f2d8ca] bg-white px-5 py-4 text-sm text-slate-700">
              Log in to continue to the dashboard.
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Login</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-900">Access your dashboard</h2>
          </div>
          <span className="rounded-full bg-[#fff1e7] px-4 py-2 text-sm font-semibold text-[#d85a2f]">
            Mock auth
          </span>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#d85a2f] focus:bg-white"
              placeholder="ava@mergen.ai"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="password">
              Password
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#d85a2f] focus:bg-white"
              placeholder="password123"
              autoComplete="current-password"
            />
          </div>

          {error ? (
            <AutoDismissNotice
              message={error}
              tone="error"
              variant="inline"
              onDismiss={() => setError(null)}
            />
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-[#d85a2f] px-5 py-3.5 text-base font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Signing in..." : "Sign in and open dashboard"}
          </button>
        </form>

        <div className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Demo users</p>
          <div className="mt-4 space-y-3">
            {demoUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  setEmail(user.email);
                  setPassword(user.password);
                  setError(null);
                }}
                className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:border-[#d85a2f] hover:bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-bold text-slate-900">{user.name}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {user.role} · {user.team}
                    </p>
                    <p className="mt-3 font-mono text-sm text-slate-700">{user.email}</p>
                    <p className="mt-1 font-mono text-sm text-slate-500">password123</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {user.id}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
