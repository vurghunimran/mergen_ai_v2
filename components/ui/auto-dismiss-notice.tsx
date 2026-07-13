"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type NoticeTone = "error" | "success" | "info";
type NoticeVariant = "banner" | "inline";

type AutoDismissNoticeProps = {
  message: ReactNode;
  onDismiss: () => void;
  title?: ReactNode;
  tone?: NoticeTone;
  variant?: NoticeVariant;
  className?: string;
  messageClassName?: string;
  titleClassName?: string;
  dismissAfterMs?: number;
  noticeKey?: string | number;
  closeLabel?: string;
};

const toneStyles: Record<
  NoticeTone,
  {
    banner: string;
    inline: string;
    title: string;
    message: string;
    icon: string;
    iconContainer: string;
    closeButton: string;
  }
> = {
  error: {
    banner: "border-[#ffd9bf] bg-[#fff4ea]",
    inline: "border-[#ffd9bf] bg-[#fff4ea]",
    title: "text-[#9a3412]",
    message: "text-[#c2410c]",
    icon: "text-[#dc2626]",
    iconContainer: "bg-[#fee2e2]",
    closeButton: "text-[#c2410c] hover:bg-[#fff1e7]"
  },
  success: {
    banner: "border-[#d7eadf] bg-[#f3fbf6]",
    inline: "border-[#d7eadf] bg-[#f3fbf6]",
    title: "text-[#166534]",
    message: "text-[#166534]",
    icon: "text-[#15803d]",
    iconContainer: "bg-[#dcfce7]",
    closeButton: "text-[#166534] hover:bg-[#e9f8ef]"
  },
  info: {
    banner: "border-[#d9c7ff] bg-[#faf7ff]",
    inline: "border-[#d9c7ff] bg-[#faf7ff]",
    title: "text-[#5b21b6]",
    message: "text-[#6d28d9]",
    icon: "text-[#7c3aed]",
    iconContainer: "bg-[#efe7ff]",
    closeButton: "text-[#6d28d9] hover:bg-[#f3edff]"
  }
};

function getDefaultIcon(tone: NoticeTone) {
  switch (tone) {
    case "error":
      return AlertCircle;
    case "success":
      return CheckCircle2;
    default:
      return Info;
  }
}

export default function AutoDismissNotice({
  message,
  onDismiss,
  title,
  tone = "info",
  variant = "banner",
  className,
  messageClassName,
  titleClassName,
  dismissAfterMs = 5000,
  noticeKey,
  closeLabel = "Dismiss message"
}: AutoDismissNoticeProps) {
  const styles = toneStyles[tone];
  const Icon = getDefaultIcon(tone);
  const dismissRef = useRef(onDismiss);
  const resolvedNoticeKey =
    noticeKey ??
    (typeof title === "string"
      ? title
      : typeof message === "string"
        ? message
        : dismissAfterMs);

  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      dismissRef.current();
    }, dismissAfterMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [dismissAfterMs, resolvedNoticeKey]);

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm",
          styles.inline,
          className
        )}
        role={tone === "error" ? "alert" : "status"}
        aria-live={tone === "error" ? "assertive" : "polite"}
      >
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", styles.icon)} />
        <div className={cn("min-w-0 flex-1 text-sm leading-6", styles.message, messageClassName)}>{message}</div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={closeLabel}
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition",
            styles.closeButton
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-2xl border px-5 py-4 shadow-sm",
        styles.banner,
        className
      )}
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label={closeLabel}
        className={cn(
          "absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full transition",
          styles.closeButton
        )}
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-10">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
            styles.iconContainer
          )}
        >
          <Icon className={cn("h-5 w-5", styles.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          {title ? (
            <p className={cn("text-[18px] font-semibold", styles.title, titleClassName)}>
              {title}
            </p>
          ) : null}
          <div
            className={cn(
              title ? "mt-1 text-sm leading-7" : "text-sm leading-7",
              styles.message,
              messageClassName
            )}
          >
            {message}
          </div>
        </div>
      </div>
    </div>
  );
}
