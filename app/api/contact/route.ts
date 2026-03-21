import { NextResponse } from "next/server";
import { Resend } from "resend";

// Add RESEND_API_KEY to .env.local and your target email to TO_EMAIL
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      purpose?: string;
      message?: string;
    };

    const toEmail = process.env.TO_EMAIL;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!toEmail || !resendApiKey) {
      return NextResponse.json({ success: false, error: "Missing email configuration" }, { status: 500 });
    }
    const resend = new Resend(resendApiKey);

    const fullName = body.fullName ?? "Unknown";
    const email = body.email ?? "Unknown";
    const purpose = body.purpose ?? "General Inquiry";
    const message = body.message ?? "";

    await resend.emails.send({
      from: "MERGEN AI Contact <onboarding@resend.dev>",
      to: [toEmail],
      subject: `New Contact Request: ${purpose}`,
      text: [
        "New contact submission from MERGEN AI",
        `Name: ${fullName}`,
        `Email: ${email}`,
        `Purpose: ${purpose}`,
        "",
        "Message:",
        message
      ].join("\n")
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to send" }, { status: 500 });
  }
}
