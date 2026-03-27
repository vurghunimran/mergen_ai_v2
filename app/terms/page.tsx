import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Bot, FileCheck2, Mail, Scale, ShieldCheck } from "lucide-react";
import SiteLogo from "@/components/SiteLogo";
import { COMPANY_NAME, LEGAL_LAST_UPDATED_LABEL, SUPPORT_EMAIL } from "@/lib/legal";

type TocItem = {
  id: string;
  title: string;
  caption: string;
};

const tocItems: TocItem[] = [
  { id: "overview", title: "Overview", caption: "What these terms cover" },
  { id: "eligibility", title: "Eligibility & Accounts", caption: "Who can use MERGEN and account responsibilities" },
  { id: "clients", title: "Client Terms", caption: "Rules for researchers, survey creators, and buyers" },
  { id: "community", title: "Community Terms", caption: "Rules for respondents and reward participation" },
  { id: "payments", title: "Payments", caption: "Checkout, pricing, and third-party payment processing" },
  { id: "ai", title: "AI Features", caption: "Use of AI tools and output responsibility" },
  { id: "acceptable-use", title: "Acceptable Use", caption: "Prohibited conduct and misuse restrictions" },
  { id: "intellectual-property", title: "Intellectual Property", caption: "Ownership of the platform and user content" },
  { id: "privacy", title: "Privacy & Data", caption: "How these terms interact with the privacy policy" },
  { id: "termination", title: "Suspension & Termination", caption: "When access can be limited or ended" },
  { id: "disclaimers", title: "Disclaimers", caption: "Important limits and service expectations" },
  { id: "liability", title: "Liability", caption: "How liability is limited where law allows" },
  { id: "law", title: "Governing Law", caption: "Applicable law and consumer protections" },
  { id: "contact", title: "Contact", caption: "How to reach MERGEN about these terms" }
];

function TermsSection({
  id,
  eyebrow,
  title,
  children
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-[30px] border border-[#eadfce] bg-white/90 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:p-8"
    >
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d85a2f]">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.03em] text-slate-900 sm:text-3xl">{title}</h2>
      <div className="mt-5 space-y-4 text-[15px] leading-7 text-slate-600">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 text-[15px] leading-7 text-slate-600">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-2 h-2 w-2 rounded-full bg-[#d85a2f]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8ef_0%,#fdf2e3_42%,#fffaf4_100%)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="relative overflow-hidden rounded-[40px] border border-[#f0d8c0] bg-[linear-gradient(135deg,#fff9f1_0%,#fff0de_46%,#ffe7d4_100%)] px-6 py-8 shadow-[0_26px_80px_rgba(15,23,42,0.08)] sm:px-8 sm:py-10 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.76),transparent_26%),radial-gradient(circle_at_84%_14%,rgba(216,90,47,0.12),transparent_24%),radial-gradient(circle_at_72%_78%,rgba(90,163,165,0.14),transparent_22%)]" />
          <div className="relative z-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center rounded-full border border-[#d85a2f]/15 bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#d85a2f]">
                  Policies
                </div>

                <div className="mt-6 flex items-center gap-4">
                  <SiteLogo markClassName="h-12" textClassName="text-2xl" />
                  <div className="h-12 w-px bg-[#d85a2f]/12" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Terms &amp; Conditions</p>
                    <p className="text-sm text-slate-500">Last updated {LEGAL_LAST_UPDATED_LABEL}</p>
                  </div>
                </div>

                <h1 className="mt-8 max-w-4xl text-4xl font-extrabold tracking-[-0.05em] text-slate-900 sm:text-5xl lg:text-6xl">
                  Terms and conditions for using the MERGEN platform.
                </h1>

                <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
                  These Terms govern access to and use of MERGEN&apos;s website, research tools, survey creation flows,
                  community participation features, AI-assisted workflows, reports, and related services. By creating an
                  account or using the platform, users agree to these Terms.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:w-[22rem] lg:grid-cols-1">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-between rounded-[24px] border border-[#d85a2f]/15 bg-white px-5 py-4 text-sm font-bold text-slate-900 shadow-sm transition hover:border-[#d85a2f]/30 hover:text-[#d85a2f]"
                >
                  Contact about these terms
                  <ArrowUpRight className="h-4 w-4" />
                </Link>

                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-flex items-center justify-between rounded-[24px] border border-white/70 bg-[#fff7ee] px-5 py-4 text-sm font-bold text-slate-900 transition hover:border-[#d85a2f]/25 hover:text-[#d85a2f]"
                >
                  {SUPPORT_EMAIL}
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[26px] border border-white/70 bg-white/90 p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1e6] text-[#d85a2f]">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-bold text-slate-900">Acceptance</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Creating an account or using the service means these Terms apply.</p>
              </div>

              <div className="rounded-[26px] border border-white/70 bg-white/90 p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1e6] text-[#d85a2f]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-bold text-slate-900">Eligibility</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">Users must be at least 18 and provide accurate account information.</p>
              </div>

              <div className="rounded-[26px] border border-white/70 bg-white/90 p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1e6] text-[#d85a2f]">
                  <Bot className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-bold text-slate-900">AI tools</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">AI output can help with research, but users remain responsible for decisions.</p>
              </div>

              <div className="rounded-[26px] border border-white/70 bg-white/90 p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1e6] text-[#d85a2f]">
                  <Scale className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-bold text-slate-900">Governing framework</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">These Terms are designed in plain language and intended to work with applicable consumer law.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="h-fit rounded-[30px] border border-[#eadfce] bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)] lg:sticky lg:top-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#d85a2f]">Table of Contents</p>
            <nav className="mt-5 space-y-2">
              {tocItems.map((item, index) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="block rounded-2xl border border-transparent px-4 py-3 transition hover:border-[#d85a2f]/15 hover:bg-[#fff5eb]"
                >
                  <p className="text-sm font-bold text-slate-900">
                    {index + 1}. {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.caption}</p>
                </a>
              ))}
            </nav>
          </aside>

          <article className="space-y-6">
            <TermsSection id="overview" eyebrow="Section 1" title="Overview">
              <p>
                These Terms and Conditions apply to all users of MERGEN, including client-side users who create and pay for
                surveys and community members who complete surveys or use community-facing platform features.
              </p>
              <p>
                If a user does not agree to these Terms, they should not create an account or use the service.
              </p>
            </TermsSection>

            <TermsSection id="eligibility" eyebrow="Section 2" title="Eligibility and account responsibilities">
              <BulletList
                items={[
                  "Users must be at least 18 years old to create an account or use MERGEN.",
                  "Users must provide accurate, current, and complete registration information and keep it updated.",
                  "Each user is responsible for maintaining the confidentiality of account credentials and for all activity under their account.",
                  "MERGEN may suspend or restrict access where account information appears false, misleading, fraudulent, or unsafe."
                ]}
              />
            </TermsSection>

            <TermsSection id="clients" eyebrow="Section 3" title="Terms for clients and survey creators">
              <BulletList
                items={[
                  "Clients are responsible for the legality, accuracy, and appropriateness of survey content, audience instructions, and research goals submitted through the platform.",
                  "Clients must have the necessary rights, permissions, and legal basis to upload or request the processing of any content or personal data they submit.",
                  "Clients must not use MERGEN to run unlawful, deceptive, discriminatory, harmful, or rights-infringing research activities.",
                  "If a client uses survey results, AI output, or platform analytics for important decisions, the client remains responsible for reviewing the output and validating it independently."
                ]}
              />
            </TermsSection>

            <TermsSection id="community" eyebrow="Section 4" title="Terms for community members">
              <BulletList
                items={[
                  "Community members must provide truthful, good-faith responses and must not use bots, scripts, multiple accounts, or misleading behavior to influence rewards or research outcomes.",
                  "Eligibility for participation in a survey may depend on profile details, quality checks, audience matching rules, and trust or fraud review systems.",
                  "MERGEN may reduce, delay, reject, or reverse incentives or participation access where abuse, manipulation, fake accounts, or low-quality participation is reasonably suspected.",
                  "Community members remain responsible for complying with survey instructions and for avoiding the submission of unlawful or infringing content."
                ]}
              />
            </TermsSection>

            <TermsSection id="payments" eyebrow="Section 5" title="Payments and checkout">
              <p>
                Certain client-facing features may require payment. Pricing and transaction details displayed in the platform
                or at checkout apply to the relevant purchase.
              </p>
              <BulletList
                items={[
                  "Payments are processed through Polar or another designated payment provider, not directly by MERGEN.",
                  "Users are responsible for reviewing the applicable pricing, billing details, taxes, and any checkout-specific rules before completing a purchase.",
                  "Third-party payment providers may apply their own terms, privacy notices, and compliance requirements."
                ]}
              />
            </TermsSection>

            <TermsSection id="ai" eyebrow="Section 6" title="AI features and generated output">
              <p>
                MERGEN offers AI-powered features such as research assistance, insights, predictive analytics, and search.
                These tools are intended to support user workflows, not replace independent judgment.
              </p>
              <BulletList
                items={[
                  "AI output may be incomplete, inaccurate, biased, or inappropriate in some situations.",
                  "Users are responsible for reviewing AI-generated content before relying on it for research, communication, publication, or business decisions.",
                  "Users must not use the AI features in a way that violates law, third-party rights, or applicable provider policies."
                ]}
              />
            </TermsSection>

            <TermsSection id="acceptable-use" eyebrow="Section 7" title="Acceptable use and prohibited conduct">
              <BulletList
                items={[
                  "No unlawful, fraudulent, abusive, defamatory, harassing, or deceptive use of the platform.",
                  "No attempts to disrupt, reverse engineer, scrape, overload, or bypass the security or access controls of the service.",
                  "No use of the platform to upload malicious code, impersonate others, or interfere with surveys, rewards, matching systems, or analytics.",
                  "No submission of content that the user has no right to share or that infringes intellectual property, privacy, or confidentiality rights."
                ]}
              />
            </TermsSection>

            <TermsSection id="intellectual-property" eyebrow="Section 8" title="Intellectual property and platform rights">
              <p>
                MERGEN retains all rights in the platform, software, interface design, branding, and service content, except for
                user content that remains owned by the user or its rightful owner.
              </p>
              <p>
                By submitting content to MERGEN, a user grants MERGEN the limited rights needed to host, process, analyze, store,
                display, and transmit that content in order to operate and improve the service and provide the requested features.
              </p>
            </TermsSection>

            <TermsSection id="privacy" eyebrow="Section 9" title="Privacy and data processing">
              <p>
                Use of the service is also governed by the{" "}
                <Link href="/privacy" className="font-semibold text-[#d85a2f]">
                  Privacy Policy
                </Link>
                . MERGEN may act as a controller for account and operational data and, in some contexts, as a processor or service
                provider for customer-managed research data.
              </p>
              <p>
                Where a client submits research-related data through MERGEN, that client is responsible for ensuring it has the
                legal rights and notices required for that processing.
              </p>
            </TermsSection>

            <TermsSection id="termination" eyebrow="Section 10" title="Suspension, restriction, and termination">
              <BulletList
                items={[
                  "MERGEN may suspend, restrict, or terminate access where it reasonably believes a user has violated these Terms, created risk for the platform, or engaged in fraud or abuse.",
                  "A user may stop using the platform at any time and may request account deletion subject to legal, operational, or security retention needs.",
                  "Termination does not automatically remove obligations that should continue by nature, including payment obligations, intellectual property protections, liability limitations, and dispute provisions."
                ]}
              />
            </TermsSection>

            <TermsSection id="disclaimers" eyebrow="Section 11" title="Disclaimers">
              <p>
                To the maximum extent permitted by applicable law, MERGEN provides the service on an &quot;as is&quot; and
                &quot;as available&quot; basis. MERGEN does not guarantee uninterrupted operation, error-free performance, or
                that outputs, matching results, analytics, or AI-generated content will always be complete or suitable for every purpose.
              </p>
            </TermsSection>

            <TermsSection id="liability" eyebrow="Section 12" title="Limitation of liability">
              <p>
                To the maximum extent permitted by law, MERGEN will not be liable for indirect, incidental, consequential,
                special, punitive, or exemplary damages arising out of or related to use of the service.
              </p>
              <p>
                Nothing in these Terms excludes or limits liability that cannot legally be excluded or limited under applicable law.
              </p>
            </TermsSection>

            <TermsSection id="law" eyebrow="Section 13" title="Governing law and dispute framework">
              <p>
                These Terms are governed by the laws of Estonia, except to the extent that mandatory consumer protection laws in
                the user&apos;s country of residence apply and cannot be excluded by contract.
              </p>
              <p>
                Before escalating a dispute, MERGEN asks users to contact the team first so the issue can be reviewed in good faith.
              </p>
            </TermsSection>

            <TermsSection id="contact" eyebrow="Section 14" title="Contact">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-[#eadfce] bg-[#fff9f3] p-5">
                  <p className="text-sm font-bold text-slate-900">Company</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {COMPANY_NAME}
                    <br />
                    Digital Company
                    <br />
                    Tallinn
                    <br />
                    Estonia
                  </p>
                </div>

                <div className="rounded-[24px] border border-[#eadfce] bg-[#fff9f3] p-5">
                  <p className="text-sm font-bold text-slate-900">Contact channels</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Email:{" "}
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-[#d85a2f]">
                      {SUPPORT_EMAIL}
                    </a>
                    <br />
                    Contact form:{" "}
                    <Link href="/contact" className="font-semibold text-[#d85a2f]">
                      mergen-ai.com/contact
                    </Link>
                  </p>
                </div>
              </div>
            </TermsSection>
          </article>
        </div>
      </div>
    </main>
  );
}
