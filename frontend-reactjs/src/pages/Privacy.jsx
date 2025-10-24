import { useMemo } from 'react';
import LegalDocumentLayout from '../components/legal/LegalDocumentLayout.jsx';

const lastUpdatedDisplay = '14 January 2025';
const lastUpdatedIso = '2025-01-14';
const policyOwner = 'Blackwellen Ltd Data Protection Office';
const companyProfile = {
  name: 'Blackwellen Ltd',
  tradingName: 'Edulure',
  jurisdiction: 'United Kingdom'
};

const privacyContacts = [
  { label: 'Privacy team', value: 'privacy@edulure.com' },
  { label: 'Secure submissions', value: 'https://legal.edulure.com/dsar' },
  { label: 'Law enforcement', value: 'legal@edulure.com (include warrant ID)' }
];

const privacyPolicy = [
  {
    heading: '1. Introduction',
    summary:
      'Explains the privacy framework, applicable legislation, and the audiences covered by this notice.',
    paragraphs: [
      'Blackwellen Ltd, a company incorporated in England and Wales with registered number 10846219 and trading as Edulure (“Edulure”, “we”, “us”, or “our”), created this Privacy Policy to explain how we process personal data when providing our learning platform, mobile applications, community features, professional services, and related offerings (together, the “Services”). We are committed to meeting the obligations imposed by the UK General Data Protection Regulation (“UK GDPR”), the Data Protection Act 2018, the Privacy and Electronic Communications Regulations, and all guidance issued by the Information Commissioner’s Office (“ICO”).',
      'This Privacy Policy is a legally binding statement of our data protection practices. It applies to every individual who interacts with Edulure, including learners, instructors, community managers, enterprise clients, prospective customers, job applicants, suppliers, and visitors to our websites or mobile applications. By accessing or using the Services you acknowledge that you have read and understood this Privacy Policy. If you do not agree with any element of this notice you should refrain from using the Services and contact us for clarification.'
    ]
  },
  {
    heading: '2. Scope and applicability',
    summary: 'Clarifies which channels are covered and how supplementary notices interplay with this document.',
    paragraphs: [
      'This Privacy Policy governs personal data collected through the Edulure platform, our iOS and Android mobile applications, the Edulure marketing website, webinars, customer success engagements, surveys, competitions, support channels, and offline events where we capture registration or contact information. It also applies to data supplied by third parties where we act as the controller, including leads provided by referral partners and lists obtained from reputable data brokers for business-to-business outreach.',
      'Separate contractual terms may apply to enterprise clients; however, those agreements incorporate this Privacy Policy by reference. We may present short-form notices or contextual prompts in product areas where it is helpful to highlight specific processing activities, and those supplemental notices should be read in conjunction with this document.'
    ]
  },
  {
    heading: '3. Who we are and how to contact us',
    summary: 'Provides primary contact routes and regulator-facing details for the data protection office.',
    paragraphs: [
      'Blackwellen Ltd is the controller of personal data described in this Privacy Policy unless otherwise stated. Our registered office is Labs Atrium, 60A Farringdon Road, London, EC1R 3GA, United Kingdom. We have appointed an internal Data Protection Officer (“DPO”) who oversees compliance with data protection legislation and who acts as the primary point of contact for supervisory authorities.',
      'You may contact the DPO or our privacy team by emailing privacy@edulure.com, writing to the address above marked FAO Data Protection Office, or by calling +44 (0)20 3808 7634 between 09:00 and 17:00 UK time on working days. For secure communications you may request our PGP key or submit a ticket through the encrypted portal available to enterprise clients.'
    ]
  },
  {
    heading: '4. Definitions',
    summary: 'Sets out terminology used throughout the notice to avoid ambiguity when comparing contracts and annexes.',
    paragraphs: [
      'For ease of reference: “personal data” means any information identifying or relating to an identifiable natural person; “processing” covers any operation performed on personal data; “controller” means the organisation that determines the purpose and means of processing; “processor” means a party that processes personal data on behalf of the controller; “UK GDPR” refers to retained EU Regulation 2016/679; “special category data” includes information revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, trade union membership, genetic data, biometric data, health data, or sexual orientation; “Services” denotes the digital learning products and supporting infrastructure offered by Edulure.'
    ]
  },
  {
    heading: '5. Lawful bases for processing',
    summary: 'Explains the grounds relied upon when processing personal data and how special categories are protected.',
    paragraphs: [
      'We only process personal data when we can rely on a lawful basis under Article 6 UK GDPR. The primary lawful bases we utilise are: (a) performance of a contract, for example providing course access to learners or paying instructor revenue shares; (b) legitimate interests, such as ensuring platform security, preventing fraud, optimising product performance, or engaging in reasonable B2B marketing; (c) compliance with legal obligations, including tax reporting, regulatory filings, sanctions screening, and responding to law enforcement requests; and (d) consent, which we obtain for activities like optional marketing communications, certain cookies, and recording customer research interviews. When processing special category data, we rely on explicit consent or another condition under Article 9, such as the establishment, exercise, or defence of legal claims.'
    ]
  },
  {
    heading: '6. Categories of personal data we collect',
    summary: 'Highlights the key data groups, from identity documentation to telemetry and support history.',
    paragraphs: [
      'We collect a broad range of personal data to deliver and improve the Services. This includes identification data (names, titles, date of birth, government-issued documentation for identity verification), contact data (email addresses, postal addresses, telephone numbers), professional and educational history, payment and tax information, account credentials, profile content, preferences, support interactions, location approximations, device identifiers, IP addresses, analytics logs, community posts, uploaded media, assessment results, and survey responses.',
      'We only request special category data in limited scenarios, such as optional demographic reporting that helps us measure inclusivity, accessibility requests, or identity documents where biometric features are inherent. We minimise the data collected, apply strict access controls, and conduct Data Protection Impact Assessments (“DPIAs”) before introducing new data types.'
    ]
  },
  {
    heading: '7. Sources of personal data',
    summary: 'Describes direct, automated, and third-party sources that feed Edulure data pipelines.',
    paragraphs: [
      'Personal data is obtained directly from individuals, automatically through their use of the Services, and from third-party sources. Direct sources include registrations, profile updates, support conversations, community engagements, user-generated content, payment forms, instructor onboarding, and surveys. Automated sources include system telemetry, cookie data, in-app analytics, session replays configured with privacy-safe masking, and security logs. Third-party sources include identity verification providers, payment processors, marketing partners, publicly available professional profiles, references supplied during instructor due diligence, and social sign-in providers when you link your Edulure account.'
    ]
  },
  {
    heading: '8. How we use personal data',
    summary: 'Summarises the purposes for which we process data, from learning delivery to fraud prevention.',
    paragraphs: [
      'We use personal data to operate, maintain, and improve the Services; to authenticate users; to personalise learning journeys; to manage instructor payouts; to provide customer and technical support; to deliver announcements and updates; to conduct research and development; to enforce our terms of service; to protect the integrity of our communities; to prevent spam, fraud, and abuse; to comply with legal obligations; to manage enterprise relationships; and to keep appropriate business records.',
      'We may aggregate or anonymise information so it no longer identifies individuals, and we may use such aggregated insights for analytics, benchmarking, and product innovation. When data is anonymised, it falls outside the scope of data protection law.'
    ]
  },
  {
    heading: '9. Automated decision-making and profiling',
    summary: 'Covers how automation supports operations and the safeguards we maintain for meaningful decisions.',
    paragraphs: [
      'Edulure utilises automation to prioritise support tickets, recommend courses, and flag suspicious activity. These systems combine user-supplied information, behavioural telemetry, and reference data. We do not deploy solely automated decisions that produce legal or similarly significant effects without human review. Where automated scoring influences outcomes—such as risk scoring within the instructor identity verification queue—trained compliance analysts review each case before final decisions are issued. You may request human intervention, express your point of view, or contest a decision by emailing privacy@edulure.com.'
    ]
  },
  {
    heading: '10. Cookies and similar technologies',
    summary: 'Details cookie categories, opt-in controls, and links to the cookie policy for full inventories.',
    paragraphs: [
      'Our websites and applications use cookies, SDKs, and similar technologies to provide essential functionality, remember user preferences, enhance performance, and deliver relevant content. Strictly necessary cookies are always active. Analytics, functional, and marketing cookies are optional and deployed based on user preferences captured through our consent management platform. You can adjust your cookie choices at any time via the “Privacy settings” link in the footer of our web experiences or the settings menu within the mobile applications. Detailed descriptions of each cookie category are maintained in the Edulure Cookie Policy.'
    ]
  },
  {
    heading: '11. Sharing personal data',
    summary: 'Explains when data is shared with processors, controllers, or public authorities.',
    paragraphs: [
      'We share personal data with carefully vetted processors who provide infrastructure, analytics, communications, payments, identity verification, and customer support tooling. Each processor is bound by contract to act only on our instructions, implement appropriate security measures, and support our audits.',
      'We may also share personal data with other controllers when legally required or when collaborating with partners such as universities, certification bodies, or enterprise clients that sponsor user accounts. These parties become independent controllers responsible for their own compliance obligations. We disclose data to law enforcement or regulators when legally compelled or when disclosure is necessary to protect rights, property, or safety.'
    ]
  },
  {
    heading: '12. International transfers',
    summary: 'Describes safeguards applied when data leaves the UK and how transfer risk is monitored.',
    paragraphs: [
      'Personal data may be transferred outside the United Kingdom when we engage service providers or when users access the platform from abroad. We ensure that appropriate safeguards are in place, such as adequacy decisions, the UK International Data Transfer Agreement, the UK Addendum to the EU Standard Contractual Clauses, or Binding Corporate Rules. Where required we conduct transfer impact assessments to evaluate the legal landscape of destination countries and implement supplementary measures—such as encryption or pseudonymisation—to uphold equivalent protection.'
    ]
  },
  {
    heading: '13. Data retention and deletion',
    summary: 'Sets retention periods, archival controls, and how data is anonymised or destroyed.',
    paragraphs: [
      'We retain personal data only for as long as necessary to fulfil the purposes outlined in this Privacy Policy, including satisfying legal, accounting, or reporting obligations. Instructor and learner account data is retained while the account is active and for seven years thereafter to maintain tax, contract, and audit records. Verification records and financial documentation may be retained for longer where legally required. System logs are retained for up to 18 months unless extended to investigate security incidents. We maintain a granular retention schedule aligned to business functions, reviewed quarterly by the DPO and legal counsel.',
      'Upon request we will anonymise or delete personal data unless retention is required by law or compelling legitimate interests. When deletion is not possible, for example within immutable backups, we will securely isolate and protect the data from further processing.'
    ]
  },
  {
    heading: '14. Your data protection rights',
    summary: 'Outlines the rights available under UK GDPR and how to exercise them.',
    paragraphs: [
      'Individuals have the following rights under the UK GDPR: the right to be informed about the processing of personal data; the right of access; the right to rectification of inaccurate data; the right to erasure; the right to restrict processing; the right to data portability; the right to object to certain processing activities; and rights concerning automated decision-making. You also have the right to withdraw consent at any time where processing is based on consent.'
    ],
    bullets: [
      'To exercise any right, contact privacy@edulure.com or use the in-product privacy centre.',
      'We will respond within one month of receiving your request, extendable by two further months for complex requests.',
      'We may ask for verification information to confirm your identity before acting on a request.'
    ]
  },
  {
    heading: '15. Data subject request workflow',
    summary: 'Explains how DSARs are triaged, fulfilled, and monitored with SLA analytics.',
    paragraphs: [
      'We operate an enterprise-grade workflow for Data Subject Access Requests (DSARs) and other privacy rights submissions. Requests are logged within our privacy operations platform, triaged by the privacy team, and tracked against service-level targets (72 hours for acknowledgement, 30 days for completion unless an extension is notified). Our admin console displays DSAR metrics, open cases, and escalation paths, ensuring parity between the web dashboard and mobile application.',
      'Where requests originate from enterprise clients we coordinate with their administrators to ensure a unified response. We maintain redaction tooling to exclude confidential commercial information and protect the rights and freedoms of others when responding to access requests.',
      'Compliance dashboards now surface “dueInHours” countdowns and “deadlineState” markers sourced from the backend Compliance Service. These insights power Annex C7 legal runbooks and alert reviewers when requests near breach thresholds so that escalations can be triggered proactively.'
    ]
  },
  {
    heading: '16. Security measures',
    summary: 'Lists the layered security controls protecting personal data across infrastructure and applications.',
    paragraphs: [
      'Security is foundational to our approach. Edulure applies layered technical and organisational measures including encryption in transit (TLS 1.2 or higher) and at rest (AES-256), strict role-based access controls, hardware security modules for key management, endpoint protection, automated patch management, vulnerability scanning, penetration testing, multi-factor authentication, and security awareness training. Access to production systems is tightly restricted and logged, with elevated privileges granted through time-bound approvals.',
      'We conduct supplier due diligence, maintain secure software development lifecycle practices, implement data loss prevention controls, and follow the principles of least privilege and segregation of duties. The mobile applications share the same security foundations through secure API gateways, certificate pinning, and runtime integrity checks.'
    ]
  },
  {
    heading: '17. Incident response and breach notification',
    summary: 'Explains how incidents are classified, remediated, and reported to authorities and users.',
    paragraphs: [
      'We maintain a documented incident response plan that is rehearsed quarterly. Incidents are categorised by severity, and cross-functional response teams are activated within 30 minutes of detection. We record incident timelines, remediation actions, and lessons learned. Where a personal data breach is likely to result in a risk to individuals, we will notify the ICO without undue delay and, where feasible, within 72 hours of becoming aware of the breach. If the risk is high, we will inform affected individuals promptly, describing the incident, potential consequences, and measures taken or proposed to mitigate adverse effects.'
    ]
  },
  {
    heading: '18. Cookies and similar technologies',
    summary: 'Reiterates opt-in choices and where to manage device-level preferences.',
    paragraphs: [
      'Mobile applications embed SDK wrappers that mirror the categories presented in our web consent manager so that preferences persist across devices. Learners and instructors can revisit the “Privacy settings” panel or adjust operating-system level controls at any time to revoke analytics, functional, or marketing signals.',
      'We periodically refresh cookie and SDK catalogues within the Trust Centre, publish retention windows, and note the lawful basis for each technology to support Annex C7 audit requirements.'
    ]
  },
  {
    heading: '19. Marketing communications',
    summary: 'Describes how we obtain consent, honour opt-outs, and differentiate transactional messages.',
    paragraphs: [
      'We send marketing emails, in-app messages, push notifications, and SMS (where permitted) to share updates about new courses, product features, webinars, and events. We only send direct marketing when we have a lawful basis, typically consent or legitimate interests for business contacts. You may opt out at any time by selecting the unsubscribe link in emails, adjusting your notification preferences within the product, disabling push notifications on your device, or contacting privacy@edulure.com. Transactional communications (such as payment confirmations, service announcements, or security alerts) are necessary for the Services and cannot be opted out of.'
    ]
  },
  {
    heading: '20. Analytics and product research',
    summary: 'Explains how analytics supports innovation while respecting privacy-enhancing techniques.',
    paragraphs: [
      'We perform analytics to understand how our Services are used, identify areas for improvement, measure the effectiveness of marketing campaigns, and conduct product research. We employ privacy-enhancing techniques such as pseudonymisation, aggregation, sampling, and differential privacy where possible. Participation in research programmes—such as user interviews or beta features—will always be optional and supported by appropriate consent forms. Insights derived from analytics are shared with internal teams under least-privilege principles and, where relevant, with enterprise customers in aggregated dashboards.'
    ]
  },
  {
    heading: '21. Community and user-generated content',
    summary: 'Defines expectations when participating in communities and how moderation is enforced.',
    paragraphs: [
      'Edulure hosts communities, discussion boards, live workshops, and peer review spaces. Content posted in these areas may be visible to other users according to the permissions set by community owners. We moderate content using automated filters and trained moderators to enforce our Community Standards. Do not share personal data about others without their consent and avoid disclosing sensitive information in public channels. We may remove content that violates our policies, issue warnings, suspend accounts, or notify relevant authorities where required.'
    ]
  },
  {
    heading: '22. Payments and financial data',
    summary: 'Covers how payment data is tokenised, screened, and retained.',
    paragraphs: [
      'Payments are processed by regulated payment providers. We do not store raw card numbers; instead, we receive tokenised references from our processors. We collect limited financial data, such as billing addresses, VAT numbers, payout bank details for instructors, and tax identification numbers required by HMRC or other tax authorities. We implement anti-money laundering and sanctions screening controls to protect the integrity of the platform and fulfil our legal duties.'
    ]
  }
];

function toSectionId(heading, index) {
  if (!heading) {
    return `section-${index + 1}`;
  }
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .replace(/-{2,}/g, '-');
}

function renderSectionContent(section, sectionIndex) {
  return (
    <div className="space-y-4 text-base leading-7 text-slate-600">
      {section.paragraphs?.map((paragraph, index) => (
        <p key={`${sectionIndex}-paragraph-${index}`}>{paragraph}</p>
      ))}
      {section.bullets ? (
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6">
          {section.bullets.map((item, index) => (
            <li key={`${sectionIndex}-bullet-${index}`}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function Privacy() {
  const meta = useMemo(
    () => ({
      title: 'Privacy Notice · Edulure',
      description: `${companyProfile.name} explains how learner, instructor, and community data is collected, used, and protected across the Edulure platform.`,
      canonicalPath: '/privacy',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'PrivacyPolicy',
        name: 'Edulure Privacy Notice',
        creator: {
          '@type': 'Organization',
          name: companyProfile.name,
          url: 'https://www.edulure.com'
        },
        dateModified: lastUpdatedIso,
        jurisdiction: companyProfile.jurisdiction
      },
      analytics: {
        page_type: 'privacy_notice'
      }
    }),
    []
  );

  const sections = useMemo(
    () =>
      privacyPolicy.map((section, index) => ({
        id: toSectionId(section.heading, index),
        heading: section.heading,
        number: section.heading?.split('.')?.[0] ?? String(index + 1),
        summary: section.summary,
        content: renderSectionContent(section, index)
      })),
    []
  );

  const hero = (
    <header className="space-y-6 text-center">
      <span className="inline-flex items-center justify-center rounded-full bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
        Annex C7 · Privacy & Governance
      </span>
      <h1 className="text-4xl font-semibold text-slate-900">Privacy Notice</h1>
      <p className="mx-auto max-w-3xl text-base leading-7 text-slate-600">
        Learn how {companyProfile.name} protects personal data, honours rights requests, and synchronises compliance telemetry
        across our legal, admin, and integration workflows.
      </p>
    </header>
  );

  const introduction = (
    <section className="rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-[0_40px_80px_-70px_rgba(15,23,42,0.45)]">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4 text-left">
          <h2 className="text-2xl font-semibold text-slate-900">Accountability at every touchpoint</h2>
          <p className="text-base leading-7 text-slate-600">
            This notice pairs with Annex C5 integration policies and Annex C6 admin approvals so everyone—learners, instructors,
            operators, and auditors—receives consistent privacy guidance regardless of how they interact with Edulure.
          </p>
          <p className="text-base leading-7 text-slate-600">
            Our privacy team monitors rights-request SLAs, consent health, and integration metadata via the Compliance Service
            described in <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">logic_flows.md</code>, ensuring the legal
            centre, admin dashboards, and invite flows stay aligned.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6">
          <h3 className="text-base font-semibold text-slate-900">Data Protection Office</h3>
          <dl className="mt-4 space-y-3 text-sm text-slate-600">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Owner</dt>
              <dd className="mt-1 font-medium text-slate-700">{policyOwner}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jurisdiction</dt>
              <dd className="mt-1 font-medium text-slate-700">{companyProfile.jurisdiction}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">ICO reference</dt>
              <dd className="mt-1 font-medium text-slate-700">ZB765432</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );

  const summary = (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6">
      <h2 className="text-lg font-semibold text-slate-900">Operational highlights</h2>
      <ul className="mt-4 grid gap-4 text-sm leading-6 text-slate-600 md:grid-cols-3">
        <li className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
          <p className="font-semibold text-emerald-700">Rights SLA tracking</p>
          <p className="mt-1">
            Compliance dashboards expose countdowns for every DSAR using <code>dueInHours</code> and <code>deadlineState</code>,
            letting admins escalate before breaches occur.
          </p>
        </li>
        <li className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
          <p className="font-semibold text-emerald-700">Consent health</p>
          <p className="mt-1">
            Legal, marketing, and integration teams pull policy timelines and consent coverage from a shared Compliance Service,
            ensuring governance artefacts remain synchronised.
          </p>
        </li>
        <li className="rounded-2xl border border-emerald-200 bg-white/90 p-4">
          <p className="font-semibold text-emerald-700">Secure intake</p>
          <p className="mt-1">
            Enterprise tenants gain encrypted submission portals and contact routing, feeding the admin approvals centre so
            Annex C6 reviewers see privacy context alongside platform setup steps.
          </p>
        </li>
      </ul>
    </section>
  );

  const footer = (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6">
        <h3 className="text-lg font-semibold text-slate-900">Contact the privacy team</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Use the appropriate channel for your query. Secure submissions feed directly into the compliance queue with full
          audit trails.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          {privacyContacts.map((contact) => (
            <div key={contact.label} className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{contact.label}</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{contact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-slate-50/90 p-6">
        <h3 className="text-lg font-semibold text-slate-900">Version control</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This Privacy Notice was last updated on <strong>{lastUpdatedDisplay}</strong>. Change history is recorded in Annex C7
          release notes and surfaced through the legal operations checklist documented in <code>docs/compliance/legal-release-checklist.md</code>.
        </p>
      </div>
    </div>
  );

  return (
    <LegalDocumentLayout
      pageTitle="Privacy Notice"
      meta={meta}
      hero={hero}
      introduction={introduction}
      summary={summary}
      sections={sections}
      footer={footer}
    />
  );
}
