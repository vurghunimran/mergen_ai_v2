import { NextResponse } from "next/server";
import { Resend } from "resend";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      purpose?: string;
      message?: string;
    };

    const fullName = body.fullName?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const purpose = body.purpose?.trim() ?? "";
    const message = body.message?.trim() ?? "";

    if (!fullName || !email || !purpose || !message || !isValidEmail(email)) {
      return NextResponse.json({ success: false, error: "Invalid contact form data" }, { status: 400 });
    }

    const toEmail = process.env.TO_EMAIL;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!toEmail || !resendApiKey) {
      return NextResponse.json({ success: false, error: "Missing email configuration" }, { status: 500 });
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || "MERGEN AI Contact <onboarding@resend.dev>";
    const resend = new Resend(resendApiKey);

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      replyTo: email,
      subject: `New Contact Request: ${purpose}`,
      text: [
        "New contact submission from MERGEN AI",
        `Name: ${fullName}`,
        `Email: ${email}`,
        `Purpose: ${purpose}`,
        "",
        "Message:",
        message
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h1 style="font-size: 20px; margin-bottom: 16px;">New contact submission</h1>
          <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email)}</p>
          <p><strong>Purpose:</strong> ${escapeHtml(purpose)}</p>
          <div style="margin-top: 20px;">
            <p style="font-weight: 700; margin-bottom: 8px;">Message</p>
            <div style="white-space: pre-wrap; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #f9fafb;">
              ${escapeHtml(message)}
            </div>
          </div>
        </div>
      `
    });

    if (emailResponse.error) {
      throw new Error(emailResponse.error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact email send failed.", error);
    return NextResponse.json({ success: false, error: "Failed to send" }, { status: 500 });
  }
}
