"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Users } from "lucide-react";

const navItems = [
  {
    href: "/surveys",
    label: "Active surveys",
    description: "Track live research and client ownership",
    icon: ClipboardList
  },
  {
    href: "/community",
    label: "Community stats",
    description: "Rewards, members, and demographic signals",
    icon: Users
  }
];

export default function AdminNav({ basePath = "/dashboard/admin" }: { basePath?: string }) {
  const pathname = usePathname();

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const href = `${basePath}${item.href}`;
        const isActive = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            className={`rounded-[24px] border px-5 py-4 transition ${
              isActive
                ? "border-[#cdd3ff] bg-[#eef1ff] text-[#202a6b] shadow-[0_18px_35px_rgba(32,42,107,0.08)]"
                : "border-white/60 bg-white/65 text-slate-700 hover:border-[#d8dcef] hover:bg-white"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-1 flex h-11 w-11 items-center justify-center rounded-2xl ${
                  isActive ? "bg-[#202a6b] text-white" : "bg-[#f2f4fb] text-slate-700"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-base font-semibold">{item.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
