import { NextResponse } from "next/server";
import { getCommunityMapData } from "@/lib/community-map-data";

export const revalidate = 300;

export async function GET() {
  const data = await getCommunityMapData();

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600"
    }
  });
}
