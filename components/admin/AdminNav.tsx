"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Gift, Users, Wallet, Plug, LayoutDashboard, ShoppingBag, Receipt } from "lucide-react";

const navItems = [
  { href: "", label: "Overview", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  {
    href: "/integrations",
    label: "Integrations",
    description: "Check production connections and release gates",
    icon: Plug
  },
  {
    href: "/surveys",
    label: "Surveys",
    description: "Track live research and client ownership",
    icon: ClipboardList
  },
  {
    href: "/community",
    label: "Community",
    description: "Rewards, members, and demographic signals",
    icon: Users
  },
  {
    href: "/withdrawals",
    label: "Withdrawals",
    description: "Review Trolley payouts and returns",
    icon: Wallet
  },
  {
    href: "/rewards",
    label: "Rewards",
    description: "Review country reward products",
    icon: Gift
  }
];

export default function AdminNav({ basePath = "/dashboard/admin" }: { basePath?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin navigation" className="flex flex-wrap gap-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const href = `${basePath}${item.href}`;
        const isActive = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-xl border px-4 py-3 transition ${
              isActive
                ? "border-[#cdd3ff] bg-[#eef1ff] text-[#202a6b] shadow-[0_18px_35px_rgba(32,42,107,0.08)]"
                : "border-white/60 bg-white/65 text-slate-700 hover:border-[#d8dcef] hover:bg-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="text-sm font-semibold">{item.label}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
