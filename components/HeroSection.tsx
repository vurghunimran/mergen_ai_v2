import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden border-t-4 border-navy/80 pt-28 sm:pt-36">
      <div className="absolute inset-0 hero-example-bg" />
      <div className="absolute inset-0 hero-example-overlay" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-7xl items-center justify-center px-4 pb-16 text-center sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          <h1 className="font-heading text-[clamp(2.9rem,9vw,7.4rem)] font-extrabold leading-[0.94] tracking-tight">
            <span className="block text-[#3f72aa]">WISDOM</span>
            <span className="mt-2 block text-[#3f72aa]">
              IN <span className="text-orange">THE DATA</span>
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-4xl font-serif text-[clamp(1.25rem,2.45vw,2.95rem)] leading-[1.22] text-[#29518a]">
            Empowering brands with hyper-targeted audience insights. We bridge the gap between complex questions and
            precise community wisdom through advanced neural analysis.
          </p>

          <Link
            href="/choose"
            className="mt-10 inline-flex rounded-full bg-gradient-to-r from-[#dce4ea] to-[#c7d4df] px-6 py-2.5 text-[clamp(1.55rem,2.9vw,2.8rem)] font-bold text-navy shadow-lg transition-transform hover:scale-105 sm:mt-12 sm:px-8 sm:py-3"
          >
            Get Started
          </Link>
        </div>
      </div>
    </section>
  );
}
