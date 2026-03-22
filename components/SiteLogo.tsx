import Image from "next/image";

type SiteLogoProps = {
  className?: string;
  markClassName?: string;
  textClassName?: string;
  label?: string;
  showText?: boolean;
};

export function SiteLogoMark({ className = "" }: { className?: string }) {
  return (
    <Image
      src="/logo-symbol-orange-hq.svg"
      alt=""
      aria-hidden="true"
      width={164}
      height={204}
      unoptimized
      className={className}
    />
  );
}

export default function SiteLogo({
  className = "",
  markClassName = "",
  textClassName = "",
  label = "MERGEN",
  showText = true
}: SiteLogoProps) {
  return (
    <span className={`flex items-center gap-3 ${className}`.trim()}>
      <SiteLogoMark className={`h-10 w-auto ${markClassName}`.trim()} />
      {showText ? (
        <span className={`text-lg font-extrabold tracking-tight text-[#d85a2f] sm:text-xl ${textClassName}`.trim()}>
          {label}
        </span>
      ) : null}
    </span>
  );
}
