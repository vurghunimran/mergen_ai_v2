import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-navy/25 bg-white">
      <nav className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between border-b border-slate-200 sm:h-16">
          <Link href="/" className="font-heading text-lg font-extrabold tracking-tight text-orange sm:text-2xl">
            MERGEN AI
          </Link>

          <div className="flex items-center gap-2 text-navy sm:gap-4">
            <Link href="/choose" className="text-sm font-medium hover:text-orange sm:text-2xl">
              Log In
            </Link>
            <Button
              asChild
              size="sm"
              className="rounded-full bg-gradient-to-r from-[#d7dbe1] to-[#f2b353] px-4 text-sm font-bold text-navy hover:opacity-90 sm:px-7 sm:text-4xl"
            >
              <Link href="/choose">Sign Up</Link>
            </Button>
          </div>
        </div>

        <div className="hidden h-14 items-center justify-center md:flex">
          <div className="flex items-center gap-8 text-lg font-medium text-navy lg:gap-14 lg:text-[42px]">
            <Link href="/choose?type=client" className="hover:text-orange">
              For Clients
            </Link>
            <Link href="/choose?type=community" className="hover:text-orange">
              For Community
            </Link>
            <Link href="/#how-it-works" className="hover:text-orange">
              How It Works
            </Link>
            <Link href="/#pricing" className="hover:text-orange">
              Pricing
            </Link>
            <Link href="/contact" className="hover:text-orange">
              About Us
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
