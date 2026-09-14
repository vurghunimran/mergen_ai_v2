import { NextResponse } from "next/server";
import { verifySurveyOrder } from "@/lib/survey-orders";
import { getCurrentUserProfile } from "@/lib/supabase/profile-server";

type RouteContext = {
  params: {
    checkoutId: string;
  };
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const authenticated = await getCurrentUserProfile();

    if (!authenticated) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (authenticated.profile.role !== "client") {
      return NextResponse.json({ success: false, error: "Only client accounts can verify survey checkouts." }, { status: 403 });
    }

    const { checkout, order, isPaid } = await verifySurveyOrder(context.params.checkoutId, authenticated.profile.id);

    return NextResponse.json({
      success: true,
      status: checkout.status,
      isPaid,
      pricing: order.pricing,
      metadata: checkout.metadata
    });
  } catch (error) {
    console.error("Polar checkout verification failed.", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to verify Polar checkout."
      },
      { status: 500 }
    );
  }
}
