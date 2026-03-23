import { NextResponse } from "next/server";
import { getPolarCheckout } from "@/lib/polar";
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

    const checkout = await getPolarCheckout(context.params.checkoutId);

    if (checkout.external_customer_id && checkout.external_customer_id !== authenticated.profile.id) {
      return NextResponse.json({ success: false, error: "This checkout belongs to another customer." }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      status: checkout.status,
      isPaid: checkout.status === "succeeded",
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
