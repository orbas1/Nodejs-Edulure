import { useCallback } from 'react';

import PageHero from '../components/PageHero.jsx';
import { LegalNavigationList, LegalNavigationSelect } from '../components/legal/LegalNavigation.jsx';
import useLegalDocumentNavigation from '../hooks/useLegalDocumentNavigation.js';
import usePageMetadata from '../hooks/usePageMetadata.js';

const contactDirectory = [
  { label: 'Legal counsel', value: 'legal@edulure.com' },
  { label: 'Data protection officer', value: 'privacy@edulure.com' },
  { label: 'Security incident hotline', value: '+44 20 3807 7777' }
];

const legalContactSections = [
  {
    id: 'data-protection-officer',
    heading: '1. Data protection officer & supervisory contact',
    paragraphs: [
      'Edulure appoints a dedicated Data Protection Officer (DPO) who oversees UK GDPR, EU GDPR, PDPA (Singapore) and state-level privacy obligations. The DPO maintains our record of processing activities, liaises with supervisory authorities, and advises on DPIAs, consent frameworks, and lawful basis analysis.',
      'Primary contact: privacy@edulure.com. Postal notices should be addressed to Blackwellen Ltd (Edulure), Attn: Data Protection Officer, 71-75 Shelton Street, London, WC2H 9JQ, United Kingdom.'
    ],
    bullets: [
      'ICO (UK) registration reference available on request for enterprise customers.',
      'EU representatives appointed through our cross-border privacy counsel – details supplied under NDA.',
      'Standard DPIA templates and processing justifications are catalogued in docs/compliance/policies/dpia-register.md.'
    ]
  },
  {
    id: 'data-subject-rights',
    heading: '2. Data subject requests & verification workflow',
    paragraphs: [
      'Submit Right of Access, Erasure, Rectification, Restriction, Portability, or Objection requests via privacy@edulure.com or the in-product privacy centre. Our Compliance API (backend-nodejs/src/controllers/ComplianceController.js) records each request in the dsr_requests table, governed by DataSubjectRequestModel. Tickets are encrypted at rest, assigned to trained reviewers, and tracked against SLA timers.',
      'Standard SLA: 30 calendar days. Complex requests may extend to 60 days with written justification. Identity verification uses secure upload links with automatic redaction before analysts review evidence.'
    ],
    bullets: [
      'DSAR progress updates are available through the customer privacy portal – reference case ID for status.',
      'Escalation path: privacy@edulure.com → DPO → Executive Legal Counsel → Supervisory Authority notification (if required).',
      'Audit evidence (response bundles, reviewer notes, completion timestamps) is retained for six years per docs/compliance/policies/dsar-handbook.md.'
    ]
  },
  {
    id: 'security-incidents',
    heading: '3. Security incident coordination & breach notifications',
    paragraphs: [
      'Report suspected security or privacy incidents immediately to security@edulure.com and legal@edulure.com. Critical events trigger our Security Operations playbook, notify the DPO, and invoke the joint incident bridge staffed by engineering, trust-safety, and legal owners.',
      'The incident registry is mirrored in compliance_audit tables and surfaced through ComplianceService.summarisePolicyAttestations to provide leadership dashboards with breach metrics and remediation status.'
    ],
    bullets: [
      '24/7 hotline: +44 20 3807 7777 (voicemail escalates to the on-call incident manager).',
      'Report includes: time detected, systems affected, containment steps, initial severity, and reporter contact.',
      'Regulatory notifications drafted within 48 hours where required by GDPR Articles 33/34 or analogous laws.'
    ]
  },
  {
    id: 'regulatory-notices',
    heading: '4. Regulatory correspondence & contractual notices',
    paragraphs: [
      'Serve legal notices, subpoenas, or regulatory correspondence to legal@edulure.com and by post to Blackwellen Ltd (Edulure), Attn: Legal Team, 71-75 Shelton Street, London, WC2H 9JQ, United Kingdom. Time-sensitive materials should also be copied to our registered agent as specified in enterprise agreements.',
      'For contractual notices under Master Service Agreements or Data Processing Agreements, reference the notice clauses within your signed order form. Electronic delivery to countersignature contacts plus legal@edulure.com satisfies mutual notice requirements unless the contract specifies otherwise.'
    ],
    bullets: [
      'We acknowledge receipt within two UK business days and provide a tracking reference for follow-up.',
      'Use encrypted channels (PGP or secure portal) for sensitive attachments – public keys provided on request.',
      'Regulatory audits coordinated through our governance squad; schedule requests should cite desired scope and timeline.'
    ]
  },
  {
    id: 'subprocessors-certifications',
    heading: '5. Subprocessors, certifications & evidence packages',
    paragraphs: [
      'The current subprocessor list, ISO 27001 certificate, SOC 2 reports, and penetration test summaries are distributed via the Trust Centre. Legal may request access by emailing trust@edulure.com with organisation details and a signed NDA if not already on file.',
      'All documents align with Annex C7 requirements and are version-controlled within docs/legal/content/trust-centre.md. Update notifications are sent at least 30 days prior to onboarding new subprocessors except for emergency replacements.'
    ],
    bullets: [
      'Evidence bundles include change logs, scope statements, compensating controls, and remediation tracking.',
      'Historical certifications remain archived for seven years for regulator inspections.',
      'Contact compliance@edulure.com to request tailored control mapping for procurement or vendor assessments.'
    ]
  },
  {
    id: 'archiving-requests',
    heading: '6. Evidence retention & litigation hold requests',
    paragraphs: [
      'Send litigation hold instructions or evidence preservation requests to legal@edulure.com with the subject “Litigation Hold”. The request should include legal basis, relevant custodians, data types, retention duration, and any confidentiality stipulations.',
      'Our Compliance data domain applies holds across consent_records, dsr_requests, audit_events, and associated storage buckets. Release instructions must be issued in writing once the hold is lifted.'
    ],
    bullets: [
      'We confirm hold activation within one UK business day and document control IDs in our governance registry.',
      'Evidence extraction for discovery follows encrypted transfer protocols; chain-of-custody logs accompany all exports.',
      'Emergency deletions (e.g., regulator-ordered) require executive sign-off and are audited via AuditEventService.'
    ]
  }
];

const lastUpdated = '14 January 2025';

export default function LegalContact() {
  const { activeSection, handleAnchorClick, handleMobileSelect } = useLegalDocumentNavigation({
    sections: legalContactSections
  });

  usePageMetadata({
    title: 'Legal Contact & Regulatory Notices · Edulure',
    description:
      'Direct lines to Edulure’s legal, data protection, and security teams with documented escalation paths and evidence handling guidance.',
    canonicalPath: '/legal/contact',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Edulure Legal Contact',
      description:
        'Official Edulure legal and privacy contact channels covering DSARs, regulatory notices, and incident escalation.',
      dateModified: lastUpdated
    },
    analytics: {
      page_type: 'legal_contact'
    }
  });

  const handleHeroAnchor = useCallback(
    (event) => handleAnchorClick(event, legalContactSections[0].id),
    [handleAnchorClick]
  );

  return (
    <div className="bg-slate-50 text-slate-700">
      <PageHero
        title="Legal contact & regulatory notices"
        description="Reach Edulure’s legal, privacy, and security teams with clear SLAs, escalation paths, and evidence-handling expectations."
        cta={
          <>
            <a
              href={`#${legalContactSections[0].id}`}
              onClick={handleHeroAnchor}
              className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
            >
              View contact protocols
            </a>
            <a
              href="mailto:legal@edulure.com"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
            >
              Email legal@edulure.com
            </a>
          </>
        }
      />

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-12 grid gap-6 rounded-4xl border border-slate-200 bg-slate-50/70 p-8 shadow-[0_40px_80px_-60px_rgba(15,23,42,0.3)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                Updated {lastUpdated}
              </span>
              <h2 className="text-2xl font-semibold text-slate-900">Transparent pathways for regulators and partners</h2>
              <p className="text-base leading-7 text-slate-600">
                Every legal inquiry routes through audited workflows. DSARs, subpoenas, and security incidents all rely on the same governance stack powering ComplianceService, guaranteeing traceability and encrypted evidence handling across global jurisdictions.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white/80 p-6">
              <h3 className="text-base font-semibold text-slate-900">Primary channels</h3>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                {contactDirectory.map((entry) => (
                  <li key={entry.label} className="flex items-center justify-between gap-4">
                    <span>{entry.label}</span>
                    <span className="font-semibold text-slate-900">{entry.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mb-10 rounded-3xl border border-slate-200 bg-slate-50 p-6" id="legal-contact-toc">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="lg:w-1/3">
                <h3 className="text-lg font-semibold text-slate-900">Navigate the contact handbook</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Choose a topic to review escalation paths, evidence requirements, and notice procedures. Navigation syncs with scroll position on desktop and mobile.
                </p>
              </div>
              <div className="lg:w-2/3">
                <LegalNavigationSelect
                  id="legal-contact-select"
                  sections={legalContactSections}
                  activeSection={activeSection}
                  onChange={handleMobileSelect}
                  className="lg:hidden"
                />
                <LegalNavigationList
                  sections={legalContactSections}
                  activeSection={activeSection}
                  onAnchorClick={handleAnchorClick}
                  className="hidden max-h-[420px] overflow-y-auto rounded-3xl border border-slate-200 bg-white/80 p-4 lg:block"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-12 lg:grid-cols-[260px_1fr]">
            <LegalNavigationList
              sections={legalContactSections}
              activeSection={activeSection}
              onAnchorClick={handleAnchorClick}
              className="hidden h-fit rounded-3xl border border-slate-200 bg-white/80 p-4 text-sm lg:block lg:sticky lg:top-32"
            />

            <div className="space-y-12">
              {legalContactSections.map((section) => (
                <article
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-36 space-y-5 rounded-3xl border border-transparent bg-white/80 p-6 shadow-[0_40px_80px_-70px_rgba(15,23,42,0.4)] transition hover:border-primary/20"
                >
                  <header className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary/70">
                      Section {section.heading.split('.')[0]}
                    </p>
                    <h2 className="text-2xl font-semibold text-slate-900">
                      {section.heading.replace(/^[0-9]+\.\s*/, '')}
                    </h2>
                  </header>
                  <div className="space-y-4 text-base leading-7 text-slate-600">
                    {section.paragraphs?.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {section.bullets && (
                      <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
                        {section.bullets.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
