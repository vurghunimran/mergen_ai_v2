import { NextResponse } from "next/server";
import { getClientPricingContext } from "@/lib/client-pricing-category";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const context = await getClientPricingContext();
    if (!context) return NextResponse.json({ success: false, error: "Client authentication required." }, { status: 401 });
    return NextResponse.json({ pricingCategory: context.pricingCategory });
  } catch {
    return NextResponse.json({ success: false, error: "Could not verify your pricing category. Please retry." }, { status: 503 });
  }
}
