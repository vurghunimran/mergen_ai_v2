import Link from "next/link";
import { Instagram, Linkedin, Twitter } from "lucide-react";
import SiteLogo from "@/components/SiteLogo";

const socialLinks = [
  {
    name: "LinkedIn",
    href: "https://linkedin.com",
    icon: Linkedin
  },
  {
    name: "Instagram",
    href: "https://instagram.com",
    icon: Instagram
  },
  {
    name: "Twitter/X",
    href: "https://x.com/MergenAI1",
    icon: Twitter
  }
];

export default function Footer() {
  return (
    <footer className="px-4 pb-10 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[34px] border border-[#eadfce] bg-[#fff7ee] px-6 py-8 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:px-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <div className="flex items-center gap-4">
              <SiteLogo markClassName="h-12" textClassName="text-2xl" />
              <div>
                <p className="text-sm text-slate-500">Wisdom in the Data.</p>
              </div>
            </div>

            <p className="mt-5 max-w-md text-sm leading-7 text-slate-600">
              Have a question, problem, or partnership inquiry? Use the contact page to send us your email, choose the
              purpose, and write your message directly to the team.
            </p>

            <Link
              href="/contact"
              className="mt-6 inline-flex items-center rounded-2xl bg-[#d85a2f] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(216,90,47,0.18)] transition hover:bg-[#bf4c25]"
            >
              Contact us
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-[auto_auto] lg:justify-end">
            <div>
              <p className="text-sm font-bold text-slate-900">Follow our pages</p>
              <div className="mt-4 flex gap-3">
                {socialLinks.map((social) => {
                  const Icon = social.icon;

                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={social.name}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d85a2f]/20 bg-white text-[#d85a2f] transition hover:border-[#d85a2f] hover:bg-[#d85a2f] hover:text-white"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-900">Policies</p>
              <div className="mt-4 flex flex-col gap-3">
                <Link
                  href="/terms"
                  className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#d85a2f]/25 hover:text-[#d85a2f]"
                >
                  Terms &amp; Conditions
                </Link>
                <Link
                  href="/privacy"
                  className="inline-flex rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#d85a2f]/25 hover:text-[#d85a2f]"
                >
                  Privacy Policy
                </Link>
                <p className="max-w-xs text-xs leading-6 text-slate-500">
                  Review the rules for using MERGEN and how we handle privacy, security, and data protection.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
