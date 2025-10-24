import { useMemo } from 'react';
import LegalDocumentLayout from '../components/legal/LegalDocumentLayout.jsx';

const companyProfile = {
  name: 'Blackwellen Ltd',
  tradingName: 'Edulure',
  jurisdiction: 'England and Wales',
  registeredOffice: '71-75 Shelton Street, London, WC2H 9JQ, United Kingdom',
  companyNumberReference:
    'Blackwellen Ltd is registered with Companies House (registration details available via the public register).'
};

const supportChannels = [
  { label: 'General legal queries', value: 'legal@edulure.com' },
  { label: 'Data protection officer', value: 'privacy@edulure.com' },
  { label: 'Enterprise contracts', value: 'enterprise@edulure.com' }
];

const lastUpdatedDate = '14 January 2025';

const termsSections = [
  {
    id: 'introduction',
    heading: '1. Introduction & contract structure',
    summary:
      'Defines who is bound by these Terms, how policies interact, and the corporate entity delivering Edulure services.',
    paragraphs: [
      `These Terms & Conditions (the "Terms") govern access to and use of the Edulure platform, products, mobile applications, and related services (collectively, the "Platform") provided by ${companyProfile.name}, trading as ${companyProfile.tradingName}. ${companyProfile.name} is a company incorporated in ${companyProfile.jurisdiction} with its registered office at ${companyProfile.registeredOffice}.`,
      'By creating an account, initiating a subscription, enrolling in a course, applying as an instructor, or otherwise using the Platform you enter into a binding contract with Blackwellen Ltd. Where you act on behalf of an organisation, you confirm that you are authorised to bind that organisation.',
      'These Terms operate alongside, and incorporate by reference, the policies and agreements listed below. The Platform must not be used unless you also agree to the referenced documents.'
    ],
    bullets: [
      'Privacy Notice and Data Protection Addendum (UK GDPR compliant).',
      'Cookie Notice and consent records.',
      'Community Code of Conduct and Safeguarding Policy.',
      'Instructor Revenue Share and Payout Policy (where applicable).',
      'Any order form, statement of work, or onboarding schedule agreed in writing.'
    ]
  },
  {
    id: 'definitions',
    heading: '2. Definitions',
    summary: 'Lists key terms that appear throughout the contract so role-specific schedules remain aligned.',
    paragraphs: [
      'For clarity, the following expressions have the meanings set out below. Additional role-specific definitions may be included in product schedules or order forms. Where capitalised terms are not defined here they have the meanings given elsewhere in these Terms.'
    ],
    bullets: [
      '"Learner" means an individual accessing learning materials, community spaces, or services delivered via the Platform.',
      '"Instructor" means an individual or organisation authorised to create, deliver, or facilitate learning content or services through the Platform.',
      '"Organisation" means a legal entity that administers multiple user accounts or purchases Platform access for its workforce or community.',
      '"Subscription" means the paid plan that governs ongoing access to defined features, cohorts, or service levels.',
      '"Content" means any text, assets, media, data, assessments, or communications uploaded, published, or transmitted within the Platform.'
    ]
  },
  {
    id: 'eligibility',
    heading: '3. Eligibility & role-based access',
    summary: 'Explains age gates, verification prerequisites, and the responsibilities attached to each user persona.',
    paragraphs: [
      'The Platform may only be used by individuals who meet the eligibility requirements described in this section. Certain functionality is restricted to verified roles and may require additional due diligence. We may refuse, suspend, or revoke access if eligibility is not maintained.',
      'If you are under 18 you must confirm that a parent or legal guardian has reviewed and accepted these Terms. Learners under 16 require written guardian consent before joining live sessions or community spaces.'
    ],
    subsections: [
      {
        title: 'Learners',
        paragraphs: [
          'Learners must provide accurate registration data, keep contact details current, and ensure that any employer-sponsored account is used in line with the employer’s policies. Learners must not share login credentials or enable unauthorised parties to access the Platform.'
        ]
      },
      {
        title: 'Instructors & facilitators',
        paragraphs: [
          'Instructors must satisfy vetting requirements, supply evidence of professional qualifications on request, and maintain any licences or insurance required by law or professional bodies. Instructors are responsible for ensuring that materials they provide are accurate, lawful, and appropriate for the intended audience.'
        ]
      },
      {
        title: 'Organisation administrators',
        paragraphs: [
          'Organisation administrators confirm that they have authority to provision access to employees, contractors, or members, and that they will ensure those users comply with these Terms and all relevant policies. Administrators must remove access promptly when an individual leaves their organisation or no longer requires the Platform.'
        ]
      }
    ]
  },
  {
    id: 'account-security',
    heading: '4. Account security & authentication',
    summary: 'Outlines password hygiene, multi-factor expectations, and incident response triggers for compromised accounts.',
    paragraphs: [
      'You are responsible for maintaining the confidentiality of your login credentials and for all activity conducted through your account. We recommend enabling multi-factor authentication wherever available. If you become aware of unauthorised use or suspected compromise, you must notify us immediately at security@edulure.com.',
      'We may require identity verification, two-step approvals, or role revalidation before reinstating access following a security concern. Accounts may be locked pending investigation of suspicious or abusive activity.'
    ],
    bullets: [
      'Use strong, unique passwords and update them regularly.',
      'Keep devices and browsers up to date and protected by industry-standard security measures.',
      'Do not circumvent or disable any access controls, audit trails, or rate limits applied by the Platform.'
    ]
  },
  {
    id: 'services',
    heading: '5. Service scope & performance commitments',
    summary: 'Describes the capabilities available under standard subscriptions and how we communicate availability targets.',
    paragraphs: [
      'Edulure delivers learning management, live collaboration, analytics, and professional services designed for education operators. Unless otherwise agreed in writing, the Platform is provided on an "as is" and "as available" basis. We strive to achieve 99.5% monthly uptime for core services and will communicate scheduled maintenance windows at least 48 hours in advance.',
      'Certain features, such as AI-powered analytics or bespoke integrations, may require additional subscriptions, statements of work, or onboarding checkpoints. Any service credits, refunds, or remedies will be governed by the applicable order form or service level agreement.'
    ],
    bullets: [
      'Scheduled maintenance is typically performed during off-peak UK hours and announced within the admin console.',
      'Emergency fixes may be deployed without prior notice where security or stability is at risk.',
      'Professional services engagements are delivered according to mutually agreed milestones and acceptance criteria.'
    ]
  },
  {
    id: 'payments',
    heading: '6. Pricing, payments & refunds',
    summary: 'Covers billing cadence, taxes, refund rules, and how marketplace settlements are handled.',
    paragraphs: [
      'Pricing for subscriptions, marketplace transactions, and professional services is set out in the order form or checkout flow applicable to your plan. Fees are payable in the currency specified and exclusive of taxes unless stated otherwise.',
      'Where statutory cooling-off periods apply (for example, consumer distance-selling regulations), you may request a refund within the applicable window. If digital content has begun with your express consent, any statutory cooling-off right ends once content is delivered.',
      'Refund requests outside statutory rights are evaluated against our Fair Refunds Policy. We may suspend or terminate access if payment is late or chargebacks are initiated without legitimate cause.',
      'Marketplace transactions attract a fixed 2.5% commission retained by Blackwellen Ltd. Providers are free to determine how much of the remaining consideration is paid to their contracted service professionals, provided they comply with applicable employment and wage legislation. The Platform operates on a non-custodial basis—funds settle directly between customers and providers through approved processors so that Blackwellen Ltd does not hold client money and does not conduct regulated activities requiring FCA authorisation. For App Store distribution, pricing is displayed in-app and checkout is completed on the web in line with Apple App Store Review Guideline 3.1.3.'
    ],
    bullets: [
      'Invoices for enterprise agreements are due within 30 days of issue unless stated otherwise.',
      'Late payments accrue interest at 4% per annum above the Bank of England base rate.',
      'We may adjust subscription fees on renewal, giving not less than 30 days’ written notice.',
      'A 2.5% platform commission applies to all marketplace payments; providers remain responsible for communicating serviceman remuneration prior to engagement.',
      'External processors (for example Stripe or Escrow.com) collect funds directly—Edulure wallets remain non-custodial to avoid FCA client-money permissions.',
      'iOS apps surface pricing information but link learners to the secure web checkout when payment is required, satisfying Apple’s rules where in-app purchase APIs are not mandated.'
    ]
  },
  {
    id: 'instructors',
    heading: '7. Instructor, coach & consultant obligations',
    summary: 'Clarifies professional standards, payout prerequisites, and safeguarding duties for service providers.',
    paragraphs: [
      'Instructors, coaches, and consultants delivering services through the Platform act as independent contractors. You are responsible for your own tax affairs, professional indemnity insurance, and compliance with industry regulations. You must ensure any marketing claims, testimonials, or outcome statements are truthful, evidence-based, and compliant with the UK Code of Non-broadcast Advertising and Direct & Promotional Marketing (CAP Code).',
      'You grant Edulure the right to host, reproduce, communicate, and promote your content for the sole purpose of delivering agreed services. We will provide you with analytics and payout information through secure dashboards. We may remove or suspend instructor content that breaches these Terms or presents legal risk.'
    ],
    bullets: [
      'Maintain accurate bank and tax information for payouts.',
      'Respect learner confidentiality and comply with safeguarding requirements.',
      'Promptly address support tickets assigned to you and keep availability calendars accurate.'
    ]
  },
  {
    id: 'intellectual-property',
    heading: '8. Intellectual property rights',
    summary: 'Sets out ownership of platform materials and the licence granted for user-generated content.',
    paragraphs: [
      'All software, documentation, design systems, brand assets, and proprietary methodologies forming part of the Platform are owned by or licensed to Blackwellen Ltd. No intellectual property rights are transferred to you other than the limited, revocable licence to access the Platform for your authorised purpose.',
      'When you upload or stream content you retain ownership of your intellectual property. You grant us a worldwide, non-exclusive, royalty-free licence to use, reproduce, adapt, publish, translate, and distribute your content solely for operating, promoting, and improving the Platform. You warrant that you have all rights necessary to grant this licence and that the content does not infringe any third-party rights.'
    ],
    bullets: [
      'Do not remove copyright notices, watermarks, or proprietary legends from Platform materials.',
      'Request written permission before using the Edulure or Blackwellen trademarks in external promotions.',
      'We may issue takedown notices or suspend access where we receive credible infringement allegations.'
    ]
  },
  {
    id: 'acceptable-use',
    heading: '9. Acceptable use & community standards',
    summary: 'Defines safety rules governing community behaviour and the enforcement actions we may take.',
    paragraphs: [
      'You must use the Platform responsibly and comply with all applicable laws, including the Online Safety Act 2023, anti-discrimination legislation, and safeguarding duties. We enforce moderation policies to protect learners and instructors. We may remove content, restrict features, or notify law enforcement where behaviour is unlawful or unsafe.'
    ],
    bullets: [
      'Do not post or transmit content that is defamatory, obscene, hateful, exploitative, or otherwise harmful.',
      'Do not harass, bully, or discriminate against other users, or facilitate unlicensed financial, medical, or legal advice.',
      'Do not introduce malware, attempt to gain unauthorised access, or scrape data without written permission.',
      'Respect privacy and confidentiality obligations; only share learner information with authorised recipients.'
    ]
  },
  {
    id: 'data-protection',
    heading: '10. Data protection & privacy',
    summary: 'Clarifies controller and processor roles, lawful bases, and international transfer safeguards.',
    paragraphs: [
      'Blackwellen Ltd acts as an independent data controller for personal data processed to operate the Platform and as a data processor when handling personal data on behalf of enterprise customers. We comply with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018. Data transfers outside the UK rely on approved safeguards such as International Data Transfer Agreements or adequacy regulations.',
      'Where we process personal data on your behalf, the Data Protection Addendum governs our respective obligations. You must obtain all necessary consents and provide all required notices to data subjects before submitting their personal data to the Platform.'
    ],
    bullets: [
      'We implement role-based access controls, encryption in transit and at rest, and regular penetration testing.',
      'You must not export or store personal data outside secure systems that meet equivalent protections.',
      'All suspected personal data breaches must be reported to privacy@edulure.com within 24 hours of discovery.'
    ]
  },
  {
    id: 'security',
    heading: '11. Security commitments & incident response',
    summary: 'Details our ISO-aligned controls and the cooperation required during investigations.',
    paragraphs: [
      'We maintain administrative, technical, and organisational measures aligned with ISO 27001 control families to protect Platform integrity. These include continuous monitoring, vulnerability management, encryption, logging, and regular access reviews. We will notify affected customers without undue delay (and within 72 hours where feasible) if we become aware of a personal data breach impacting their accounts.',
      'You agree to cooperate fully during security investigations and to follow our incident response instructions, including resetting credentials or disabling integrations if requested.'
    ],
    bullets: [
      'Security advisories are published via the Edulure Trust Centre and emailed to administrators.',
      'Coordinated vulnerability disclosure submissions can be sent to security@edulure.com with encryption via our published PGP key.',
      'We reserve the right to monitor usage for security and compliance purposes while respecting applicable privacy laws.'
    ]
  },
  {
    id: 'third-parties',
    heading: '12. Third-party services & integrations',
    summary: 'Explains responsibilities when connecting external tools or using partner services.',
    paragraphs: [
      'The Platform integrates with selected third-party tools (for example, video conferencing, analytics, and payment providers). Third-party services are governed by their own terms and privacy notices. We are not responsible for third-party failures or acts, except where required by non-excludable law. We vet critical suppliers for security and compliance, but you remain responsible for reviewing whether third-party terms meet your requirements.'
    ],
    bullets: [
      'Disconnect any integration that is no longer required to reduce data exposure.',
      'Notify us before connecting custom or self-hosted integrations so we can assess security considerations.',
      'Third-party terms may change; continued use of the integration constitutes acceptance of the updated conditions.'
    ]
  },
  {
    id: 'suspension',
    heading: '13. Suspension, termination & data export',
    summary: 'Covers how accounts may be suspended, the export windows provided, and retention expectations.',
    paragraphs: [
      'We may suspend or terminate access immediately if you materially breach these Terms, fail to pay charges when due, or if continued access would expose us or other users to unacceptable risk. Wherever reasonable, we will provide prior notice and an opportunity to remedy the issue. You may terminate your account at any time through account settings or by contacting support.',
      'Upon termination, your licence to use the Platform ends and you must cease all use of Edulure materials. We provide a 30-day window for you to export permissible data following termination, unless legal obligations require a longer retention period. We may retain anonymised or aggregated data for analytics and product improvement.'
    ],
    bullets: [
      'Enterprise customers may receive tailored offboarding assistance as specified in their statement of work.',
      'Suspension does not relieve you of the obligation to pay outstanding fees.',
      'We may preserve evidence of breaches to comply with regulatory requests or to exercise our legal rights.'
    ]
  },
  {
    id: 'liability',
    heading: '14. Liability, warranties & statutory rights',
    summary: 'Sets liability caps, statutory carve-outs, and clarifies business versus consumer positions.',
    paragraphs: [
      'Nothing in these Terms limits or excludes liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, or any other liability that cannot be limited or excluded under English law. Subject to the foregoing, we exclude all implied warranties to the extent permitted by law and the Platform is provided without guarantee that it will meet your specific requirements.',
      'For business users, our aggregate liability arising out of or related to the Terms shall not exceed the fees paid or payable to us in the 12 months prior to the event giving rise to the claim. For consumers, statutory rights are unaffected and we will ensure remedies required under the Consumer Rights Act 2015 are available where the Platform is defective.'
    ],
    bullets: [
      'We are not liable for indirect, consequential, or purely economic loss, including loss of profits, revenue, or anticipated savings.',
      'We are not responsible for failures caused by events beyond our reasonable control, including acts of God, industrial action, or internet outages.',
      'You remain responsible for configuring the Platform to achieve compliance obligations specific to your organisation.'
    ]
  },
  {
    id: 'indemnity',
    heading: '15. Indemnities',
    summary: 'Explains how mutual indemnities operate for user-generated risk and third-party IP claims.',
    paragraphs: [
      'You agree to indemnify, defend, and hold harmless Blackwellen Ltd, its directors, employees, and agents from and against any claims, liabilities, damages, costs, and expenses (including reasonable legal fees) arising out of or in connection with your breach of these Terms, your content, or your violation of any law or third-party rights.',
      'Where a third party alleges that the Platform infringes its intellectual property rights, we will (at our discretion) defend the claim, modify the Platform to avoid infringement, or terminate the impacted service with a pro-rata refund. This obligation does not apply if the claim arises from your modifications, misuse, or combination of the Platform with unauthorised materials.'
    ]
  },
  {
    id: 'changes',
    heading: '16. Changes to the Platform or these Terms',
    summary: 'Describes how we communicate material changes and the options you have if you disagree.',
    paragraphs: [
      'We may update the Platform, introduce new features, or make legally required modifications without prior notice. Material changes that significantly impact your rights or obligations will be communicated at least 30 days in advance via email or in-app notification, unless immediate change is required by law or to address security vulnerabilities.',
      'Continued use of the Platform after the effective date of updated Terms constitutes acceptance of the changes. If you do not agree, you must stop using the Platform before the changes take effect and may request account closure.'
    ]
  },
  {
    id: 'governing-law',
    heading: '17. Governing law & dispute resolution',
    summary: 'Confirms the jurisdiction governing the contract and the escalation path before litigation.',
    paragraphs: [
      'These Terms and any non-contractual obligations arising out of or in connection with them are governed by the laws of England and Wales. The courts of England and Wales have exclusive jurisdiction to settle disputes, except that consumers resident in Scotland or Northern Ireland may bring proceedings in their local courts.',
      'Before commencing litigation, the parties shall attempt to resolve the dispute through good-faith negotiations, escalating to senior leadership and, where agreed, mediation in London in accordance with the Centre for Effective Dispute Resolution (CEDR) Model Mediation Procedure.'
    ]
  },
  {
    id: 'contact',
    heading: '18. Contact & notices',
    summary: 'Provides the formal notice address and how operational communications are delivered.',
    paragraphs: [
      `${companyProfile.companyNumberReference}`,
      `Formal notices must be sent in writing to: ${companyProfile.name}, ${companyProfile.registeredOffice}. Operational communications may be delivered through in-app messaging or email.`,
      'Notices to you will be sent to the primary email address listed in your account. It is your responsibility to keep contact details accurate. For rapid issues, please use the support channels listed below.'
    ]
  }
];

function renderSectionContent(section) {
  return (
    <div className="space-y-4 text-base leading-7 text-slate-600">
      {section.paragraphs?.map((paragraph, index) => (
        <p key={`${section.id}-paragraph-${index}`}>{paragraph}</p>
      ))}
      {section.bullets ? (
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6">
          {section.bullets.map((item, index) => (
            <li key={`${section.id}-bullet-${index}`}>{item}</li>
          ))}
        </ul>
      ) : null}
      {section.subsections ? (
        <div className="space-y-5">
          {section.subsections.map((subsection, index) => (
            <div key={`${section.id}-subsection-${index}`} className="rounded-2xl border border-slate-200 bg-white/80 p-5">
              <h3 className="text-base font-semibold text-slate-900">{subsection.title}</h3>
              <div className="mt-2 space-y-3 text-sm leading-6 text-slate-600">
                {subsection.paragraphs?.map((text, paragraphIndex) => (
                  <p key={`${section.id}-subsection-${index}-paragraph-${paragraphIndex}`}>{text}</p>
                ))}
                {subsection.bullets ? (
                  <ul className="list-disc space-y-2 pl-5">
                    {subsection.bullets.map((item, bulletIndex) => (
                      <li key={`${section.id}-subsection-${index}-bullet-${bulletIndex}`}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function Terms() {
  const meta = useMemo(
    () => ({
      title: 'Terms & Conditions · Edulure',
      description: `Read the contractual terms governing access to the Edulure platform operated by ${companyProfile.name}.`,
      canonicalPath: '/terms',
      structuredData: {
        '@context': 'https://schema.org',
        '@type': 'TermsOfService',
        name: 'Edulure Terms & Conditions',
        provider: {
          '@type': 'Organization',
          name: companyProfile.name,
          url: 'https://www.edulure.com'
        },
        dateModified: lastUpdatedDate
      },
      analytics: {
        page_type: 'terms_notice'
      }
    }),
    []
  );

  const sections = useMemo(
    () =>
      termsSections.map((section, index) => ({
        id: section.id,
        heading: section.heading,
        number: section.heading.split('.')[0] ?? String(index + 1),
        summary: section.summary,
        content: renderSectionContent(section)
      })),
    []
  );

  const hero = (
    <header className="space-y-6 text-center">
      <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
        Annex C7 · Legal & Compliance
      </span>
      <h1 className="text-4xl font-semibold text-slate-900">Terms & Conditions</h1>
      <p className="mx-auto max-w-3xl text-base leading-7 text-slate-600">
        These Terms define how learners, instructors, and enterprise customers interact with Edulure across web and mobile
        experiences. They pair with our privacy, safeguarding, and invite policies so every release aligns with Annex C5-C7
        governance requirements.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <a
          href={`#${sections[0]?.id ?? 'introduction'}`}
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark"
        >
          Review obligations
        </a>
        <a
          href="mailto:legal@edulure.com"
          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
        >
          Contact legal team
        </a>
      </div>
    </header>
  );

  const introduction = (
    <section className="rounded-3xl border border-slate-200 bg-white/80 p-8 shadow-[0_40px_80px_-70px_rgba(15,23,42,0.45)]">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <div className="space-y-4 text-left">
          <h2 className="text-2xl font-semibold text-slate-900">Why these terms matter</h2>
          <p className="text-base leading-7 text-slate-600">
            Our platform spans synchronous classrooms, asynchronous communities, credential verification, and integrations. This
            contract keeps obligations clear across every modality so operations, trust & safety, and finance teams can act on a
            single source of truth during incident response and onboarding reviews.
          </p>
          <p className="text-base leading-7 text-slate-600">
            The terms harmonise with Integration Credential Invitations (Annex C5), Admin Approvals (Annex C6), and the Legal &
            Compliance Centre (Annex C7) documented in <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">logic_flows.md</code>.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6">
          <h3 className="text-base font-semibold text-slate-900">Registered details</h3>
          <dl className="mt-4 space-y-3 text-sm text-slate-600">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Legal entity</dt>
              <dd className="mt-1 font-medium text-slate-700">{companyProfile.name} trading as {companyProfile.tradingName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jurisdiction</dt>
              <dd className="mt-1 font-medium text-slate-700">{companyProfile.jurisdiction}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registered office</dt>
              <dd className="mt-1 font-medium text-slate-700">{companyProfile.registeredOffice}</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );

  const summary = (
    <section className="rounded-3xl border border-primary/20 bg-primary/5 p-6">
      <h2 className="text-lg font-semibold text-slate-900">Key commitments at a glance</h2>
      <ul className="mt-4 grid gap-4 text-sm leading-6 text-slate-600 md:grid-cols-3">
        <li className="rounded-2xl border border-primary/10 bg-white/90 p-4">
          <p className="font-semibold text-primary">Lifecycle governance</p>
          <p className="mt-1">
            Onboarding, invite flows, and admin approvals are tethered to the same policy catalogue, ensuring legal copy matches
            the integrations and setup logic shipped in Annex C5 and C6.
          </p>
        </li>
        <li className="rounded-2xl border border-primary/10 bg-white/90 p-4">
          <p className="font-semibold text-primary">Security-first defaults</p>
          <p className="mt-1">
            MFA, credential rotation, and incident reporting timelines align with backend enforcement so compliance dashboards
            and runtime services remain synchronised.
          </p>
        </li>
        <li className="rounded-2xl border border-primary/10 bg-white/90 p-4">
          <p className="font-semibold text-primary">Global readiness</p>
          <p className="mt-1">
            International transfers, dispute resolution, and governing-law clauses accommodate cross-border customers while
            respecting UK legal requirements.
          </p>
        </li>
      </ul>
    </section>
  );

  const footer = (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6">
        <h3 className="text-lg font-semibold text-slate-900">Support channels</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Reach the appropriate team during UK business hours. Escalations route through the compliance centre for audit
          logging.
        </p>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          {supportChannels.map((channel) => (
            <div key={channel.label} className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-primary/70">{channel.label}</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{channel.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-slate-50/90 p-6">
        <h3 className="text-lg font-semibold text-slate-900">Version control</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          These Terms were last reviewed on <strong>{lastUpdatedDate}</strong>. Substantive updates are communicated via email and
          in-product notifications at least 30 days before they take effect, unless urgent legal or security obligations require
          immediate change.
        </p>
      </div>
    </div>
  );

  return (
    <LegalDocumentLayout
      pageTitle="Terms & Conditions"
      meta={meta}
      hero={hero}
      introduction={introduction}
      summary={summary}
      sections={sections}
      footer={footer}
    />
  );
}
