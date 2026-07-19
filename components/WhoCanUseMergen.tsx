import Image from "next/image";
import { Building2, GraduationCap, Microscope, Sparkles } from "lucide-react";

const audienceGroups = [
  {
    icon: GraduationCap,
    title: "Students & Universities",
    description:
      "For students, departments, and university teams running thesis, capstone, dissertation, and institutional research projects.",
    accent: "For students, universities, and academic programs",
    imageAlt: "Student studying inside a university library",
    imageSrc:
      "https://images.unsplash.com/photo-1741699427788-74db37639fc3?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000"
  },
  {
    icon: Microscope,
    title: "Faculty & Academic Researchers",
    description:
      "Support faculty-led studies with targeted participant access, cleaner survey design, and decision-ready reporting.",
    accent: "For faculty-led studies and research groups",
    imageAlt: "Professor teaching students in a lecture hall",
    imageSrc:
      "https://images.unsplash.com/photo-1758270703884-e1c40c43465f?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000"
  },
  {
    icon: Building2,
    title: "Global R&D & Innovation",
    description:
      "For R&D units, innovation centers, NGOs, and international institutions validating programs, policies, and education initiatives.",
    accent: "For R&D, innovation, and global institutions",
    imageAlt: "Research and innovation team collaborating around a table",
    imageSrc:
      "https://images.unsplash.com/photo-1768796370577-c6e8b708b980?auto=format&fit=crop&fm=jpg&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&ixlib=rb-4.1.0&q=60&w=3000"
  }
];

export default function WhoCanUseMergen() {
  return (
    <section id="who-can-use" className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-[40px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,248,239,0.8)_0%,rgba(255,241,225,0.84)_45%,rgba(255,235,212,0.88)_100%)] px-5 py-12 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur sm:px-8 lg:px-12 lg:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(255,255,255,0.65),transparent_20%),radial-gradient(circle_at_80%_16%,rgba(241,163,95,0.24),transparent_24%),radial-gradient(circle_at_50%_80%,rgba(216,90,47,0.12),transparent_24%)]" />
          <div className="absolute left-[-7%] top-16 h-52 w-52 rounded-full bg-white/35 blur-3xl" />
          <div className="absolute right-[-6%] top-10 h-64 w-64 rounded-full bg-[#efaa57]/18 blur-3xl" />

          <div className="relative z-10">
            <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#d85a2f]/15 bg-white/80 px-4 py-2 text-sm font-semibold text-[#d85a2f] shadow-[0_12px_24px_rgba(216,90,47,0.08)]">
                  <Sparkles className="h-4 w-4" />
                  Who Can Use MERGEN?
                </span>
                <h2 className="mt-6 text-3xl font-extrabold tracking-[-0.05em] text-slate-900 sm:text-4xl lg:text-[2.9rem]">
                  Built for <span className="text-[#d85a2f]">education and institutional research</span>.
                </h2>
                <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  Connect educational institutions, research teams, and innovation programs with reliable participant insight.
                </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {audienceGroups.map((group) => {
                const Icon = group.icon;

                return (
                  <article
                    key={group.title}
                    className="group overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.82)_0%,rgba(255,249,242,0.95)_100%)] shadow-[0_22px_50px_rgba(15,23,42,0.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.10)]"
                  >
                    <div className="relative aspect-[1.2/1] overflow-hidden">
                      <Image
                        src={group.imageSrc}
                        alt={group.imageAlt}
                        fill
                        sizes="(min-width: 1024px) 33vw, 100vw"
                        className="object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,39,0.06)_0%,rgba(17,24,39,0.10)_40%,rgba(17,24,39,0.55)_100%)]" />
                      <div className="absolute left-5 top-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-[#fff3ea] text-[#d85a2f] shadow-[0_12px_24px_rgba(15,23,42,0.12)] backdrop-blur">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="absolute bottom-5 left-5 right-5">
                        <span className="inline-flex rounded-full border border-[#f3c9aa] bg-[#d85a2f] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white shadow-[0_12px_22px_rgba(216,90,47,0.22)]">
                          {group.accent}
                        </span>
                      </div>
                    </div>

                    <div className="p-6">
                      <h3 className="text-[1.55rem] font-extrabold leading-tight tracking-[-0.03em] text-[#d85a2f]">
                        {group.title}
                      </h3>
                      <p className="mt-3 text-[15px] leading-7 text-slate-600">{group.description}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
