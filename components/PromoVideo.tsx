import { Sparkles } from "lucide-react";

export default function PromoVideo() {
  return (
    <section id="promo-video" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-[36px] border border-[#f1d6c4] bg-[linear-gradient(180deg,#fffaf4_0%,#fff3e7_100%)] px-6 py-10 text-center shadow-[0_24px_70px_rgba(15,23,42,0.07)] sm:px-8 sm:py-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#d85a2f]/20 bg-[#fff0e5] px-4 py-2 text-sm font-semibold text-[#d85a2f]">
          <Sparkles className="h-4 w-4" />
          Vision video
        </span>

        <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-extrabold tracking-[-0.04em] text-[#d85a2f] sm:text-4xl">
          A short look at the idea behind Mergen and where it is going.
        </h2>

        <div className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-[28px] border border-[#d85a2f]/15 bg-[#151515] p-3 shadow-[0_26px_80px_rgba(15,23,42,0.16)]">
          <div className="mb-3 flex items-center gap-2 px-2 pt-1">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
          </div>

          <div className="overflow-hidden rounded-[20px]">
            <video
              controls
              preload="metadata"
              className="aspect-video w-full bg-black object-cover"
              playsInline
            >
              <source src="/mergen-introduction.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>
    </section>
  );
}
