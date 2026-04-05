import { PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type TutorialLinkProps = {
  href: string;
  label: string;
  className?: string;
};

export default function TutorialLink({ href, label, className }: TutorialLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border border-[#efd4c4] bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_14px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-[#d85a2f]/35 hover:text-[#d85a2f]",
        className
      )}
    >
      <PlayCircle className="h-4 w-4" />
      {label}
    </a>
  );
}
