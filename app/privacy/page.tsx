import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Bot, Lock, Mail, Scale, ShieldCheck } from "lucide-react";
import SiteLogo from "@/components/SiteLogo";

type TocItem = {
  id: string;
  title: string;
  caption: string;
};

const tocItems: TocItem[] = [
  { id: "summary", title: "Summary", caption: "Key points at a glance" },
  { id: "infocollect", title: "Information We Collect", caption: "What you give us and what we collect automatically" },
  { id: "infouse", title: "How We Use Information", caption: "Service delivery, support, security, and improvement" },
  { id: "legalbases", title: "Legal Bases", caption: "GDPR and similar lawful processing grounds" },
  { id: "whoshare", title: "Sharing", caption: "When information is shared and with whom" },
  { id: "cookies", title: "Cookies", caption: "Tracking, preferences, and analytics" },
  { id: "ai", title: "AI Products", caption: "How MERGEN uses AI-powered features" },
  { id: "inforetain", title: "Retention", caption: "How long information is kept" },
  { id: "infosafe", title: "Security", caption: "Technical and organizational safeguards" },
  { id: "infominors", title: "Minors", caption: "Age restrictions and child safety" },
  { id: "privacyrights", title: "Privacy Rights", caption: "Access, correction, deletion, and more" },
  { id: "uslaws", title: "US State Rights", caption: "Rights available to residents of certain US states" },
  { id: "otherlaws", title: "Other Regions", caption: "EEA, UK, Switzerland, Australia, New Zealand, and South Africa" },
  { id: "policyupdates", title: "Updates", caption: "How changes to this notice are handled" },
  { id: "contact", title: "Contact", caption: "How to reach MERGEN about this notice" },
  { id: "request", title: "Data Requests", caption: "How to review, update, or delete your data" }
];

function PrivacySection({
  id,
  title,
  eyebrow,
  children
}: {
  id: string;
  title: string;
  eyebrow: string;
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

export default function PrivacyPage() {
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
                    <p className="text-sm font-semibold text-slate-900">Privacy Notice</p>
                    <p className="text-sm text-slate-500">Last updated March 27, 2026</p>
                  </div>
                </div>

                <h1 className="mt-8 max-w-4xl text-4xl font-extrabold tracking-[-0.05em] text-slate-900 sm:text-5xl lg:text-6xl">
                  Privacy Policy for the MERGEN website and platform.
                </h1>

                <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600 sm:text-lg">
                  This notice describes how MERGEN UO collects, uses, stores, shares, and protects personal information when
                  people visit{" "}
                  <a href="https://mergen-ai.com" target="_blank" rel="noreferrer" className="font-semibold text-[#d85a2f]">
                    mergen-ai.com
                  </a>
                  , create accounts, run surveys, answer surveys, use AI-powered features, or contact the team.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:w-[22rem] lg:grid-cols-1">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-between rounded-[24px] border border-[#d85a2f]/15 bg-white px-5 py-4 text-sm font-bold text-slate-900 shadow-sm transition hover:border-[#d85a2f]/30 hover:text-[#d85a2f]"
                >
                  Contact for privacy requests
                  <ArrowUpRight className="h-4 w-4" />
                </Link>

                <a
                  href="mailto:team@mergen-ai.com"
                  className="inline-flex items-center justify-between rounded-[24px] border border-white/70 bg-[#fff7ee] px-5 py-4 text-sm font-bold text-slate-900 transition hover:border-[#d85a2f]/25 hover:text-[#d85a2f]"
                >
                  team@mergen-ai.com
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[26px] border border-white/70 bg-white/90 p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1e6] text-[#d85a2f]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-bold text-slate-900">Data controller</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">MERGEN UO, Tallinn, Estonia</p>
              </div>

              <div className="rounded-[26px] border border-white/70 bg-white/90 p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1e6] text-[#d85a2f]">
                  <Scale className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-bold text-slate-900">Coverage</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">US state privacy laws, GDPR, UK GDPR, and regional rights</p>
              </div>

              <div className="rounded-[26px] border border-white/70 bg-white/90 p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1e6] text-[#d85a2f]">
                  <Bot className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-bold text-slate-900">AI features</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">AI research, insights, predictive analytics, and search tools</p>
              </div>

              <div className="rounded-[26px] border border-white/70 bg-white/90 p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1e6] text-[#d85a2f]">
                  <Lock className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm font-bold text-slate-900">Core principle</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Data is processed to operate the service, protect users, and comply with law.
                </p>
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
            <PrivacySection id="summary" eyebrow="Summary" title="Summary of key points">
              <p>
                This page is a styled website version of the privacy notice you supplied. It covers the main privacy topics users
                usually need first: what MERGEN collects, why it is processed, how long it is kept, which vendors help operate the
                service, and how users can exercise privacy rights.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-[#eadfce] bg-[#fff9f3] p-5">
                  <p className="text-sm font-bold text-slate-900">What we process</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Account data, survey content, response data, payment context, support messages, and basic technical usage data.
                  </p>
                </div>
                <div className="rounded-[24px] border border-[#eadfce] bg-[#fff9f3] p-5">
                  <p className="text-sm font-bold text-slate-900">How to contact us</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Email{" "}
                    <a href="mailto:team@mergen-ai.com" className="font-semibold text-[#d85a2f]">
                      team@mergen-ai.com
                    </a>{" "}
                    or use the{" "}
                    <Link href="/contact" className="font-semibold text-[#d85a2f]">
                      contact page
                    </Link>{" "}
                    for privacy requests.
                  </p>
                </div>
              </div>
            </PrivacySection>

            <PrivacySection id="infocollect" eyebrow="Section 1" title="What information do we collect?">
              <p>
                MERGEN collects personal information that users voluntarily provide when they register, complete profiles, create
                surveys, answer surveys, pay for services, or contact the team. The exact categories depend on how the person uses
                the platform.
              </p>
              <BulletList
                items={[
                  "Account and profile information such as names, email addresses, country, job or academic details, and passwords.",
                  "Survey and research information such as survey prompts, audience filters, response content, trust scoring inputs, and generated reports.",
                  "Support and communications data submitted through contact forms, emails, onboarding flows, and customer support interactions.",
                  "Payment-related context required to complete purchases. MERGEN does not store full card details directly; checkout and payment handling are processed by Polar.",
                  "Automatically collected information such as IP address, browser and device characteristics, operating system, usage activity, log files, and cookie-related preferences."
                ]}
              />
              <p>
                The platform may also collect information needed to maintain security, prevent fraud, measure performance, and
                understand how features are being used.
              </p>
            </PrivacySection>

            <PrivacySection id="infouse" eyebrow="Section 2" title="How do we process your information?">
              <p>MERGEN processes personal information to operate the website and deliver the platform&apos;s features.</p>
              <BulletList
                items={[
                  "Create and manage accounts, log users in, and maintain profile records.",
                  "Generate surveys, distribute them to matched communities, collect responses, and prepare reports.",
                  "Run AI-powered features such as AI research assistance, insights, predictive analytics, and search workflows.",
                  "Send service-related communications, payment confirmations, and support replies.",
                  "Protect the service against abuse, fraud, suspicious activity, and operational failures.",
                  "Improve product quality, evaluate feature performance, and comply with legal obligations."
                ]}
              />
            </PrivacySection>

            <PrivacySection id="legalbases" eyebrow="Section 3" title="What legal bases do we rely on?">
              <p>
                Where GDPR, UK GDPR, or similar laws apply, MERGEN relies on recognized legal bases to process personal
                information.
              </p>
              <BulletList
                items={[
                  "Consent, when a user has clearly agreed to a specific processing activity.",
                  "Performance of a contract, when processing is necessary to provide the service the user requested.",
                  "Legitimate interests, such as improving the platform, preventing fraud, and maintaining service quality, where those interests do not override user rights.",
                  "Legal obligations, when MERGEN must keep or disclose information to comply with law.",
                  "Vital interests, in limited cases where processing is needed to protect someone from serious harm."
                ]}
              />
              <p>
                In some cases MERGEN acts as a data controller for account and operational data, and in other cases may process
                certain research data on behalf of customers according to their instructions.
              </p>
            </PrivacySection>

            <PrivacySection id="whoshare" eyebrow="Section 4" title="When and with whom do we share information?">
              <p>
                MERGEN may share personal information only where needed to operate the service, complete transactions, protect the
                platform, or comply with law.
              </p>
              <BulletList
                items={[
                  "Supabase for authentication, database hosting, and secure application infrastructure.",
                  "Google Gemini and related Google-hosted AI services to support AI product features described in this notice.",
                  "Polar for secure payment processing and checkout flows.",
                  "Resend for transactional and operational email delivery.",
                  "Professional advisers, regulators, law enforcement, or counterparties in a merger, financing, sale, or business transfer where legally appropriate."
                ]}
              />
              <p>
                MERGEN does not state in this notice that it sells personal information for ordinary marketing purposes, and any
                targeted advertising or similar tracking choices remain subject to applicable law and user controls.
              </p>
            </PrivacySection>

            <PrivacySection id="cookies" eyebrow="Section 5" title="Do we use cookies and similar technologies?">
              <p>
                Yes. MERGEN may use cookies and similar technologies to keep sessions working, remember preferences, secure user
                accounts, analyze feature usage, and improve the reliability of the website.
              </p>
              <BulletList
                items={[
                  "Essential cookies and tokens help with authentication, security, and core site functionality.",
                  "Preference cookies may remember settings and reduce repeated prompts.",
                  "Analytics-style tracking may help understand traffic, performance, and usage patterns."
                ]}
              />
              <p>
                Users can usually manage cookies through browser settings. Restricting cookies may affect some parts of the
                service.
              </p>
            </PrivacySection>

            <PrivacySection id="ai" eyebrow="Section 6" title="Do we offer AI-based products?">
              <p>
                Yes. MERGEN offers products, features, and tools powered by artificial intelligence and machine learning. These AI
                features are designed to help users create surveys, generate insights, analyze responses, and search or structure
                research information more efficiently.
              </p>
              <BulletList
                items={[
                  "AI research support",
                  "AI insights and reporting",
                  "AI predictive analytics",
                  "AI search and workflow assistance"
                ]}
              />
              <p>
                Inputs, outputs, and related personal information may be processed by MERGEN and by its AI service providers to
                deliver these features. MERGEN expects users not to submit content that violates provider terms or applicable law.
              </p>
            </PrivacySection>

            <PrivacySection id="inforetain" eyebrow="Section 7" title="How long do we keep your information?">
              <p>
                MERGEN keeps personal information only for as long as necessary to provide the service, maintain active accounts,
                meet legal obligations, resolve disputes, prevent fraud, and enforce agreements.
              </p>
              <BulletList
                items={[
                  "Active account information is generally retained while the user maintains an account.",
                  "Operational and payment records may be retained longer where required for accounting, security, or compliance reasons.",
                  "When data is no longer needed, MERGEN deletes it, anonymizes it, or isolates it securely until deletion is possible."
                ]}
              />
            </PrivacySection>

            <PrivacySection id="infosafe" eyebrow="Section 8" title="How do we keep your information safe?">
              <p>
                MERGEN uses technical and organizational measures designed to protect personal information. These measures may
                include controlled access, authentication safeguards, secure infrastructure, and monitoring for abuse or fraud.
              </p>
              <p>
                Even with strong safeguards, no internet transmission or storage system can be guaranteed to be 100% secure. Users
                should access the service in secure environments and protect their own account credentials.
              </p>
            </PrivacySection>

            <PrivacySection id="infominors" eyebrow="Section 9" title="Do we collect information from minors?">
              <p>
                MERGEN does not knowingly collect, solicit, or market to children under 18 years of age. By using the service, a
                person represents that they are at least 18, or that a parent or guardian has authorized the use where allowed by
                law.
              </p>
              <p>
                If MERGEN learns that personal information from a child under 18 has been collected without proper authorization,
                it will take reasonable steps to deactivate the account and remove the data.
              </p>
            </PrivacySection>

            <PrivacySection id="privacyrights" eyebrow="Section 10" title="What are your privacy rights?">
              <p>
                Depending on location, users may have rights to access, correct, delete, restrict, object to, or obtain a copy of
                their personal information. They may also be able to withdraw consent where consent is the basis for processing.
              </p>
              <BulletList
                items={[
                  "Access to the personal information MERGEN holds about you.",
                  "Correction of inaccurate or incomplete data.",
                  "Deletion of data where retention is no longer required.",
                  "Portability or a copy of information you provided, where the law grants that right.",
                  "Objection to certain processing or withdrawal of consent where applicable.",
                  "Opt-out from marketing communications by using unsubscribe tools or contacting MERGEN directly."
                ]}
              />
              <p>
                Users can contact MERGEN through{" "}
                <a href="mailto:team@mergen-ai.com" className="font-semibold text-[#d85a2f]">
                  team@mergen-ai.com
                </a>{" "}
                or the{" "}
                <Link href="/contact" className="font-semibold text-[#d85a2f]">
                  contact page
                </Link>{" "}
                to make a privacy request.
              </p>
            </PrivacySection>

            <PrivacySection id="uslaws" eyebrow="Section 11" title="Do United States residents have specific privacy rights?">
              <p>
                Yes. Residents of certain US states may have specific rights under applicable privacy laws, including rights to
                know whether MERGEN processes their data, access it, correct it, delete it, obtain a copy, and opt out of certain
                kinds of processing such as targeted advertising, sale, or profiling where those rights apply.
              </p>
              <p>
                MERGEN may need to verify identity before completing a request. Users may also be permitted to use an authorized
                agent where applicable law allows it. If MERGEN declines a request, some users may have a right to appeal that
                decision.
              </p>
            </PrivacySection>

            <PrivacySection id="otherlaws" eyebrow="Section 12" title="Do other regions have specific privacy rights?">
              <p>
                Users in the EEA, UK, Switzerland, Australia, New Zealand, South Africa, and certain other regions may have
                additional privacy rights depending on local law.
              </p>
              <BulletList
                items={[
                  "EEA, UK, and Switzerland: rights may include access, rectification, erasure, restriction, portability, objection, and complaints to supervisory authorities.",
                  "Australia and New Zealand: users may request access to or correction of personal information and may complain to relevant privacy regulators.",
                  "South Africa: users may request access or correction and may contact the Information Regulator if dissatisfied with the response."
                ]}
              />
              <p>
                Where MERGEN is acting as a controller for personal information in these regions, users may contact the company or
                its listed representative as described below.
              </p>
            </PrivacySection>

            <PrivacySection id="policyupdates" eyebrow="Section 13" title="Do we make updates to this notice?">
              <p>
                Yes. MERGEN may update this privacy policy when laws, vendors, internal practices, or product features change. When
                updates are material, the revised version will show a new effective date and may be highlighted more prominently.
              </p>
              <p>Users should review this page from time to time to stay informed about how their information is handled.</p>
            </PrivacySection>

            <PrivacySection id="contact" eyebrow="Section 14" title="How can you contact us about this notice?">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[24px] border border-[#eadfce] bg-[#fff9f3] p-5">
                  <p className="text-sm font-bold text-slate-900">Company</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    MERGEN UO
                    <br />
                    Digital Company
                    <br />
                    Tallinn
                    <br />
                    Estonia
                  </p>
                </div>

                <div className="rounded-[24px] border border-[#eadfce] bg-[#fff9f3] p-5">
                  <p className="text-sm font-bold text-slate-900">Primary contact</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Email:{" "}
                    <a href="mailto:team@mergen-ai.com" className="font-semibold text-[#d85a2f]">
                      team@mergen-ai.com
                    </a>
                    <br />
                    Contact form:{" "}
                    <Link href="/contact" className="font-semibold text-[#d85a2f]">
                      mergen-ai.com/contact
                    </Link>
                  </p>
                </div>
              </div>

              <div className="rounded-[24px] border border-[#eadfce] bg-white p-5">
                <p className="text-sm font-bold text-slate-900">EEA representative listed in the supplied notice</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Vurghun Imranli
                  <br />
                  Email:{" "}
                  <a href="mailto:vurqunimranli2001@gmail.com" className="font-semibold text-[#d85a2f]">
                    vurqunimranli2001@gmail.com
                  </a>
                  <br />
                  Phone: +31 645 251 601
                  <br />
                  Location: Tallinn, Estonia
                </p>
              </div>
            </PrivacySection>

            <PrivacySection id="request" eyebrow="Section 15" title="How can you review, update, or delete the data we collect?">
              <p>
                Users can request access to, correction of, or deletion of personal information by contacting MERGEN directly.
                Formal requests can be sent through the{" "}
                <Link href="/contact" className="font-semibold text-[#d85a2f]">
                  contact page
                </Link>{" "}
                or by email to{" "}
                <a href="mailto:team@mergen-ai.com" className="font-semibold text-[#d85a2f]">
                  team@mergen-ai.com
                </a>
                .
              </p>
              <p>
                Where account-level profile edits are available inside the platform, users may also update basic information there.
                MERGEN may ask for reasonable identity verification before processing a request.
              </p>
            </PrivacySection>
          </article>
        </div>
      </div>
    </main>
  );
}
