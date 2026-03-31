import "server-only";

import { headers } from "next/headers";
import { notFound } from "next/navigation";

function isLocalHost(host: string) {
  const normalizedHost = host.trim().toLowerCase();

  if (!normalizedHost) {
    return false;
  }

  return (
    normalizedHost.startsWith("localhost") ||
    normalizedHost.startsWith("127.0.0.1") ||
    normalizedHost.startsWith("0.0.0.0") ||
    normalizedHost.endsWith(".localhost")
  );
}

export function requireLocalPreviewAccess() {
  const requestHeaders = headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const host = forwardedHost ?? requestHeaders.get("host") ?? "";

  if (isLocalHost(host)) {
    return;
  }

  notFound();
}
