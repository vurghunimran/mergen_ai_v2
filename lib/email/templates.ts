import { escapeHtml } from "@/lib/email/config";

type ContactSubmissionEmailInput = {
  fullName: string;
  email: string;
  purpose: string;
  message: string;
  submittedAt: string;
};

type SurveyLaunchEmailInput = {
  firstName: string;
  title: string;
  description: string;
  questionCount: number;
  targetResponses: number;
  dashboardUrl: string;
};

function formatSubmittedAt(value: string) {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(timestamp);
}

export function buildContactSubmissionEmail(input: ContactSubmissionEmailInput) {
  const submittedAtLabel = formatSubmittedAt(input.submittedAt);

  return {
    subject: `New Contact Request: ${input.purpose}`,
    text: [
      "New contact submission from MERGEN AI",
      `Submitted: ${submittedAtLabel} UTC`,
      `Name: ${input.fullName}`,
      `Email: ${input.email}`,
      `Purpose: ${input.purpose}`,
      "",
      "Message:",
      input.message
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h1 style="font-size: 20px; margin-bottom: 16px;">New contact submission</h1>
        <p><strong>Submitted:</strong> ${escapeHtml(submittedAtLabel)} UTC</p>
        <p><strong>Name:</strong> ${escapeHtml(input.fullName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
        <p><strong>Purpose:</strong> ${escapeHtml(input.purpose)}</p>
        <div style="margin-top: 20px;">
          <p style="font-weight: 700; margin-bottom: 8px;">Message</p>
          <div style="white-space: pre-wrap; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #f9fafb;">
            ${escapeHtml(input.message)}
          </div>
        </div>
      </div>
    `
  };
}

export function buildSurveyLaunchEmail(input: SurveyLaunchEmailInput) {
  return {
    subject: `New survey available: ${input.title}`,
    text: [
      `Hello ${input.firstName},`,
      "",
      "A new survey matching your MERGEN AI profile is now available.",
      "",
      input.title,
      input.description,
      `Questions: ${input.questionCount}`,
      `Target responses: ${input.targetResponses}`,
      "",
      `Open your dashboard: ${input.dashboardUrl}`
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <p>Hello ${escapeHtml(input.firstName)},</p>
        <p>A new survey matching your MERGEN AI profile is now available.</p>
        <div style="margin: 20px 0; border: 1px solid #e5e7eb; border-radius: 16px; padding: 20px; background: #f9fafb;">
          <h1 style="font-size: 22px; margin: 0 0 12px;">${escapeHtml(input.title)}</h1>
          <p style="margin: 0 0 16px;">${escapeHtml(input.description)}</p>
          <p style="margin: 0 0 16px;"><strong>Questions:</strong> ${input.questionCount} | <strong>Target responses:</strong> ${input.targetResponses}</p>
        </div>
        <p style="margin: 20px 0 0;">
          <a href="${escapeHtml(input.dashboardUrl)}" style="display: inline-block; border-radius: 999px; background: #ea580c; color: #ffffff; font-weight: 700; padding: 12px 20px; text-decoration: none;">
            Open Community Dashboard
          </a>
        </p>
        <p style="margin-top: 16px; font-size: 14px; color: #6b7280;">If the button does not work, open: ${escapeHtml(input.dashboardUrl)}</p>
      </div>
    `
  };
}
