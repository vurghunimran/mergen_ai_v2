import { NextResponse } from "next/server";
import { buildContactSubmissionEmail } from "@/lib/email/templates";
import {
  createResendClient,
  getContactInboxEmail,
  getResendFromEmail,
  isValidEmail
} from "@/lib/email/config";

const MAX_FULL_NAME_LENGTH = 120;
const MAX_PURPOSE_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 5000;

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

    if (
      !fullName ||
      fullName.length > MAX_FULL_NAME_LENGTH ||
      !email ||
      !isValidEmail(email) ||
      !purpose ||
      purpose.length > MAX_PURPOSE_LENGTH ||
      !message ||
      message.length > MAX_MESSAGE_LENGTH
    ) {
      return NextResponse.json({ success: false, error: "Invalid contact form data" }, { status: 400 });
    }

    const toEmail = getContactInboxEmail();

    if (!toEmail || !isValidEmail(toEmail)) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing CONTACT_TO_EMAIL or TO_EMAIL configuration"
        },
        { status: 500 }
      );
    }

    const resend = createResendClient();
    const fromEmail = getResendFromEmail("MERGEN AI Contact <onboarding@resend.dev>");
    const emailContent = buildContactSubmissionEmail({
      fullName,
      email,
      purpose,
      message,
      submittedAt: new Date().toISOString()
    });

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      replyTo: email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
      tags: [
        { name: "flow", value: "contact" },
        {
          name: "purpose",
          value: purpose.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "general"
        }
      ]
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
