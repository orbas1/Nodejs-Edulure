import { useMemo } from 'react';
import LegalDocumentLayout from '../components/legal/LegalDocumentLayout.jsx';

const lastReviewed = '14 January 2025';

const contactChannels = [
  { label: 'General legal', value: 'legal@edulure.com' },
  { label: 'Privacy & DSARs', value: 'privacy@edulure.com' },
  { label: 'Secure evidence portal', value: 'https://legal.edulure.com/submit' }
];

const escalationWindows = [
  { label: 'Business hours', value: '09:00–17:00 UK time, Monday to Friday' },
  { label: 'Urgent security incidents', value: '24/7 monitored via security@edulure.com' },
  { label: 'Regulatory deadlines', value: 'Escalate 48 hours before statutory expiry' }
];

const legalSections = [
  {
    heading: '1. Engagement principles',
    summary: 'Sets expectations for how the Edulure legal team triages inbound requests.',
    paragraphs: [
      'The legal and compliance team responds to inbound requests based on severity, statutory deadlines, and operational impact. All correspondence is recorded within our governance platform so audit trails align with Annex C7 release artefacts.',
      'When you contact us, provide a clear subject line, organisation name, and any relevant reference numbers. This ensures the request is routed to the correct specialist (privacy, commercial, trust & safety, or policy).'
    ]
  },
  {
    heading: '2. Privacy & data rights coordination',
    summary: 'Explains how privacy requests flow from the contact centre into Compliance Service queues.',
    paragraphs: [
      'Email privacy@edulure.com or use the encrypted DSAR portal for privacy enquiries. Submissions automatically create entries within the Compliance Service so reviewers can track <code>dueInHours</code> and <code>deadlineState</code> metrics alongside supporting evidence.',
      'Enterprise administrators should include tenant identifiers so that admin approvals (Annex C6) display privacy context next to platform setup tasks.'
    ]
  },
  {
    heading: '3. Contracts, procurement & commercial terms',
    summary: 'Provides the route for NDAs, order forms, and security questionnaires.',
    paragraphs: [
      'Send contract redlines, procurement documents, and due diligence questionnaires to legal@edulure.com. Include requested turnaround dates and access credentials for any vendor portals.',
      'Where questionnaires overlap with integration policies (Annex C5), the legal team collaborates with platform operations to return consolidated answers and updated runbook links.'
    ]
  },
  {
    heading: '4. Law enforcement, regulators & escalations',
    summary: 'Describes how to submit formal legal process or raise urgent issues.',
    paragraphs: [
      'Law enforcement and regulators should direct warrants, subpoenas, or statutory notices to legal@edulure.com with “URGENT” in the subject line. Include the relevant legal authority, deadline, and any confidentiality requirements.',
      'We acknowledge receipt within one business day and coordinate with our Data Protection Officer and security leads to fulfil requests while protecting user rights.'
    ]
  },
  {
    heading: '5. Evidence packages & audit support',
    summary: 'Outlines the evidence available to support audits and incident reviews.',
    paragraphs: [
      'When requesting audit evidence, specify the scope (for example: consent coverage, invite acceptance logs, admin approval histories) and the time period required. Evidence bundles are generated from the same data sources referenced in <code>logic_flows.md</code> so legal runbooks, admin dashboards, and integration governance remain in sync.',
      'Large exports may require secure delivery via our evidence portal. We will provide instructions and expiring download links once packages are ready.'
    ]
  }
];

function renderSectionContent(section, index) {
  return (
    <div className="space-y-4 text-base leading-7 text-slate-600">
      {section.paragraphs?.map((paragraph, paragraphIndex) => (
        <p key={`${index}-paragraph-${paragraphIndex}`}>{paragraph}</p>
      ))}
    </div>
  );
}

export default function LegalContact() {
  const meta = useMemo(
    () => ({
      title: 'Legal & Compliance Contacts · Edulure',
      description: 'Reach the Edulure legal, privacy, and compliance teams for contracts, DSARs, and statutory notices.',
      canonicalPath: '/legal/contact',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'ContactPage',
        name: 'Edulure Legal & Compliance Contacts',
        provider: {
          '@type': 'Organization',
          name: 'Blackwellen Ltd',
          url: 'https://www.edulure.com'
        },
        dateModified: lastReviewed
      },
      analytics: {
        page_type: 'legal_contact'
      }
    }),
    []
  );

  const sections = useMemo(
    () =>
      legalSections.map((section, index) => ({
        id: section.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        heading: section.heading,
        number: section.heading.split('.')?.[0] ?? String(index + 1),
        summary: section.summary,
        content: renderSectionContent(section, index)
      })),
    []
  );

  const hero = (
    <header className="space-y-6 text-center">
      <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
        Annex C7 · Contact Centre
      </span>
      <h1 className="text-4xl font-semibold text-slate-900">Legal & Compliance Contacts</h1>
      <p className="mx-auto max-w-3xl text-base leading-7 text-slate-600">
        Use these channels to reach Blackwellen Ltd’s legal, privacy, and governance specialists. All routes feed into the same
        audit-ready workflows documented across Annex C5–C7 so context follows every escalation.
      </p>
    </header>
  );

  const introduction = (
    <section className="rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-[0_40px_80px_-70px_rgba(15,23,42,0.45)]">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4 text-left">
          <h2 className="text-2xl font-semibold text-slate-900">Aligned with platform governance</h2>
          <p className="text-base leading-7 text-slate-600">
            Every contact channel is wired to the same governance repositories described in <code>logic_flows.md</code>. That
            means privacy requests immediately surface in the compliance centre, integration queries sync with invite policies,
            and admin approvals show legal context alongside platform configuration steps.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6">
          <h3 className="text-base font-semibold text-slate-900">Response windows</h3>
          <dl className="mt-4 space-y-3 text-sm text-slate-600">
            {escalationWindows.map((window) => (
              <div key={window.label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{window.label}</dt>
                <dd className="mt-1 font-medium text-slate-700">{window.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );

  const summary = (
    <section className="rounded-3xl border border-primary/20 bg-primary/5 p-6">
      <h2 className="text-lg font-semibold text-slate-900">What happens after you get in touch</h2>
      <ul className="mt-4 grid gap-4 text-sm leading-6 text-slate-600 md:grid-cols-3">
        <li className="rounded-2xl border border-primary/10 bg-white/90 p-4">
          <p className="font-semibold text-primary">Triage & routing</p>
          <p className="mt-1">
            Requests inherit metadata (tenant, integration, case IDs) so they populate the correct queues across admin approvals,
            invite governance, and compliance dashboards.
          </p>
        </li>
        <li className="rounded-2xl border border-primary/10 bg-white/90 p-4">
          <p className="font-semibold text-primary">SLA visibility</p>
          <p className="mt-1">
            Countdown timers from the Compliance Service ensure reviewers see upcoming deadlines alongside each contact thread,
            mirroring the DSAR analytics documented in Annex C7.
          </p>
        </li>
        <li className="rounded-2xl border border-primary/10 bg-white/90 p-4">
          <p className="font-semibold text-primary">Evidence capture</p>
          <p className="mt-1">
            Attachments are hashed and stored in our secure evidence vault, providing the audit proof referenced in
            <code>docs/compliance/legal-release-checklist.md</code>.
          </p>
        </li>
      </ul>
    </section>
  );

  const footer = (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6">
        <h3 className="text-lg font-semibold text-slate-900">Primary contacts</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Choose the channel aligned with your request. All submissions receive an automatic acknowledgement with a tracking ID.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          {contactChannels.map((channel) => (
            <div key={channel.label} className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-primary/70">{channel.label}</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{channel.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-slate-50/90 p-6">
        <h3 className="text-lg font-semibold text-slate-900">Review cadence</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Contact details are reviewed quarterly and whenever Annex C7 releases land. Last reviewed on <strong>{lastReviewed}</strong>.
        </p>
      </div>
    </div>
  );

  return (
    <LegalDocumentLayout
      pageTitle="Legal & Compliance Contacts"
      meta={meta}
      hero={hero}
      introduction={introduction}
      summary={summary}
      sections={sections}
      footer={footer}
    />
  );
}
