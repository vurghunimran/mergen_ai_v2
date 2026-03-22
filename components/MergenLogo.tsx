type MergenLogoProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
};

export function MergenLogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M18 10L34 26L27 33L18 24L11 31L27 47L43 31L27 15"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M34 26L49 41L34 56"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.86"
      />
      <rect
        x="26"
        y="26"
        width="12"
        height="12"
        rx="2.5"
        transform="rotate(45 32 32)"
        fill="currentColor"
        opacity="0.14"
      />
      <rect
        x="26"
        y="26"
        width="12"
        height="12"
        rx="2.5"
        transform="rotate(45 32 32)"
        stroke="currentColor"
        strokeWidth="2.5"
      />
    </svg>
  );
}

export default function MergenLogo({
  className = "",
  markClassName = "",
  wordmarkClassName = "",
  showWordmark = true
}: MergenLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#fff1e7] text-[#e56a1c] shadow-[0_12px_28px_rgba(229,106,28,0.14)] ${markClassName}`.trim()}
      >
        <MergenLogoMark className="h-6 w-6" />
      </span>

      {showWordmark ? (
        <span
          className={`text-lg font-extrabold tracking-[-0.05em] text-[#d85a2f] sm:text-xl ${wordmarkClassName}`.trim()}
        >
          MERGEN AI
        </span>
      ) : null}
    </div>
  );
}
