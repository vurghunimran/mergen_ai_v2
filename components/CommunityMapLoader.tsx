"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { CommunityMapData } from "@/lib/community-map-data";

const CommunityMap = dynamic(() => import("@/components/CommunityMap"), {
  ssr: false,
  loading: () => <CommunityMapShell />
});

const emptyCommunityMapData: CommunityMapData = {
  memberDistribution: {},
  totalCountries: 0,
  totalMembers: 0,
  maxMembers: 1
};

function CommunityMapShell() {
  return (
    <section id="community-map" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[36px] border border-[#eadfce] bg-[#f8f1e6] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.05)] sm:p-8 lg:p-10">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full border border-[#d85a2f]/20 bg-[#fff0e5] px-4 py-2 text-sm font-semibold text-[#d85a2f]">
            Community regions
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-[-0.04em] text-slate-900 sm:text-4xl">
            A growing community across multiple regions.
          </h2>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="h-20 rounded-2xl bg-white/80" />
          <div className="h-20 rounded-2xl bg-white/80" />
        </div>
        <div className="mt-8 aspect-[980/520] rounded-[32px] border border-white/70 bg-[#f4eadb]" />
      </div>
    </section>
  );
}

export default function CommunityMapLoader() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [data, setData] = useState<CommunityMapData | null>(null);

  useEffect(() => {
    const target = containerRef.current;

    if (!target || shouldLoad) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "700px 0px" }
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    if (!shouldLoad || data) {
      return;
    }

    let cancelled = false;

    async function loadCommunityMapData() {
      try {
        const response = await fetch("/api/community-map");

        if (!response.ok) {
          throw new Error("Could not load community map data.");
        }

        const payload = (await response.json()) as CommunityMapData;

        if (!cancelled) {
          setData(payload);
        }
      } catch {
        if (!cancelled) {
          setData(emptyCommunityMapData);
        }
      }
    }

    void loadCommunityMapData();

    return () => {
      cancelled = true;
    };
  }, [data, shouldLoad]);

  return (
    <div ref={containerRef}>
      {shouldLoad && data ? <CommunityMap {...data} /> : <CommunityMapShell />}
    </div>
  );
}
