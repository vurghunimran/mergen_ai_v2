export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-cream px-4 py-16 text-navy sm:px-6 lg:px-8">
      <article className="mx-auto w-full max-w-3xl space-y-8">
        <header>
          <h1 className="font-heading text-4xl font-extrabold text-orange sm:text-5xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-navy/70">Last updated: March 2026</p>
        </header>

        <section className="space-y-3">
          <h2 className="font-heading text-2xl font-bold">Data Collection</h2>
          <p>
            MERGEN AI collects personal and research-related data required to provide the platform, including profile details,
            account credentials, survey content, response data, usage logs, and communication records. We only request data that
            is necessary to deliver research workflows, support users, maintain platform security, and meet legal obligations.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-2xl font-bold">How We Use Your Data</h2>
          <p>
            We process personal data to operate user accounts, generate and distribute surveys, verify respondent quality, produce
            AI-assisted insights, provide customer support, and improve platform performance. We may also use aggregated and
            anonymized analytics for product development and service optimization.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-2xl font-bold">GDPR Compliance</h2>
          <p>
            Where the GDPR applies, MERGEN AI acts as a data controller for account and operational data, and may act as a data
            processor for client-provided research data. Processing is based on lawful grounds such as contract performance,
            legitimate interests, consent, and legal compliance, depending on the activity.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-2xl font-bold">Data Retention</h2>
          <p>
            We retain personal data only for as long as required to provide services, comply with legal obligations, resolve
            disputes, and enforce agreements. Retention periods vary by data type and regulatory context. When data is no longer
            required, it is deleted or irreversibly anonymized.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-2xl font-bold">Your Rights</h2>
          <p>
            You may request access, correction, deletion, restriction, objection, or portability of your personal data, subject to
            applicable law. You can also withdraw consent where processing is consent-based. We respond to valid requests within
            required timelines and may request identity verification before processing.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-2xl font-bold">Third-party Services</h2>
          <p>
            MERGEN AI uses service providers including Supabase (data infrastructure), Google Gemini (AI processing), and Polar
            (payments). These providers process data under contractual terms and appropriate safeguards. Their independent privacy
            notices describe how they handle data in their systems.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-2xl font-bold">Contact for Data Requests</h2>
          <p>
            For privacy questions or to exercise your rights, contact us through the contact page and include “Data Request” in
            your message subject. We will review and respond according to applicable privacy laws.
          </p>
        </section>
      </article>
    </main>
  );
}
