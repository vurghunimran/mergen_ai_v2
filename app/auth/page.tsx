import { Suspense } from "react";
import AuthClient from "./AuthClient";

function AuthPageFallback() {
  return (
    <main className="min-h-screen bg-[#fffdf9] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[32px] border border-white/80 bg-white/92 px-5 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
        <div className="h-12 w-40 rounded-2xl bg-slate-100" />
      </div>
      <div className="mx-auto mt-8 grid max-w-7xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="h-[32rem] rounded-[36px] bg-[#fff8f1]" />
        <div className="h-[42rem] rounded-[36px] bg-white" />
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <AuthClient />
    </Suspense>
  );
}
