import { safeVerificationPath } from "@/lib/security/redirect";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const requestedNext = safeVerificationPath(searchParams.get("next"));
  const isResetDestination = new URL(requestedNext, origin).pathname === "/auth/reset-password";
  const next = type === "recovery" && !isResetDestination
    ? "/auth/reset-password"
    : requestedNext;
  const isRecovery = type === "recovery" || isResetDestination;

  if ((tokenHash && type) || code) {
    const supabase = await createClient();
    const { error } = tokenHash && type
      ? await supabase.auth.verifyOtp({
          type: type as EmailOtpType,
          token_hash: tokenHash
        })
      : await supabase.auth.exchangeCodeForSession(code!);

    if (!error) {
      if (isRecovery) {
        return NextResponse.redirect(new URL(next, origin));
      }

      const confirmed = new URL("/auth/confirmation", origin);
      confirmed.searchParams.set("result", "success");
      confirmed.searchParams.set("next", next);
      return NextResponse.redirect(confirmed);
    }
  }

  return NextResponse.redirect(new URL(
    isRecovery ? "/auth/reset-password?error=invalid-link" : "/auth/confirmation?result=invalid",
    origin
  ));
}
