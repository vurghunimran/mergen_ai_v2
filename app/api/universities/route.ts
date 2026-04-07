import { NextResponse } from "next/server";
import { popularUniversities } from "@/lib/auth-options";

const FALLBACK_UNIVERSITIES: Record<string, string[]> = {
  Azerbaijan: [
    "Baku State University",
    "Azerbaijan State Oil and Industry University",
    "ADA University",
    "Khazar University",
    "Other"
  ],
  Canada: [
    "University of Toronto",
    "McGill University",
    "University of British Columbia",
    "University of Alberta",
    "Other"
  ],
  Germany: [
    "Technical University of Munich",
    "Ludwig Maximilian University of Munich",
    "Heidelberg University",
    "RWTH Aachen University",
    "Other"
  ],
  India: [
    "Indian Institute of Technology Bombay",
    "Indian Institute of Science",
    "University of Delhi",
    "Jawaharlal Nehru University",
    "Other"
  ],
  Singapore: ["National University of Singapore", "Nanyang Technological University", "Other"],
  Turkey: [
    "Middle East Technical University",
    "Bogazici University",
    "Istanbul Technical University",
    "Koc University",
    "Other"
  ],
  "United Kingdom": [
    "University of Oxford",
    "University of Cambridge",
    "Imperial College London",
    "University College London",
    "Other"
  ],
  "United States": [
    "Harvard University",
    "Stanford University",
    "Massachusetts Institute of Technology",
    "University of California, Berkeley",
    "Other"
  ]
};

type UniversityRecord = {
  name?: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country")?.trim();

  if (!country) {
    return NextResponse.json({ universities: popularUniversities });
  }

  try {
    const response = await fetch(`https://universities.hipolabs.com/search?country=${encodeURIComponent(country)}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(6000)
    });

    if (!response.ok) {
      throw new Error(`University lookup failed with status ${response.status}`);
    }

    const payload = (await response.json()) as UniversityRecord[];
    const universities = Array.from(
      new Set(payload.map((entry) => entry.name?.trim()).filter((entry): entry is string => Boolean(entry)))
    ).sort((left, right) => left.localeCompare(right));

    if (universities.length > 0) {
      return NextResponse.json({ universities: [...universities, "Other"] });
    }
  } catch {
    // Fall through to local fallback data.
  }

  return NextResponse.json({
    universities: FALLBACK_UNIVERSITIES[country] ?? popularUniversities
  });
}
