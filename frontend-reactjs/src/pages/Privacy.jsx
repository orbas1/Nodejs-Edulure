import PageHero from '../components/PageHero.jsx';
import usePageMetadata from '../hooks/usePageMetadata.js';

const lastUpdated = '24 November 2024';
const policyOwner = 'Blackwellen Ltd Data Protection Office';

const privacyPolicy = [
  {
    heading: '1. Introduction',
    paragraphs: [
      'Blackwellen Ltd, a company incorporated in England and Wales with registered number 10846219 and trading as Edulure (“Edulure”, “we”, “us”, or “our”), created this Privacy Policy to explain how we process personal data when providing our learning platform, mobile applications, community features, professional services, and related offerings (together, the “Services”). We are committed to meeting the obligations imposed by the UK General Data Protection Regulation (“UK GDPR”), the Data Protection Act 2018, the Privacy and Electronic Communications Regulations, and all guidance issued by the Information Commissioner’s Office (“ICO”).',
      'This Privacy Policy is a legally binding statement of our data protection practices. It applies to every individual who interacts with Edulure, including learners, instructors, community managers, enterprise clients, prospective customers, job applicants, suppliers, and visitors to our websites or mobile applications. By accessing or using the Services you acknowledge that you have read and understood this Privacy Policy. If you do not agree with any element of this notice you should refrain from using the Services and contact us for clarification.'
    ]
  },
  {
    heading: '2. Scope and applicability',
    paragraphs: [
      'This Privacy Policy governs personal data collected through the Edulure platform, our iOS and Android mobile applications, the Edulure marketing website, webinars, customer success engagements, surveys, competitions, support channels, and offline events where we capture registration or contact information. It also applies to data supplied by third parties where we act as the controller, including leads provided by referral partners and lists obtained from reputable data brokers for business-to-business outreach.',
      'Separate contractual terms may apply to enterprise clients; however, those agreements incorporate this Privacy Policy by reference. We may present short-form notices or contextual prompts in product areas where it is helpful to highlight specific processing activities, and those supplemental notices should be read in conjunction with this document.'
    ]
  },
  {
    heading: '3. Who we are and how to contact us',
    paragraphs: [
      'Blackwellen Ltd is the controller of personal data described in this Privacy Policy unless otherwise stated. Our registered office is Labs Atrium, 60A Farringdon Road, London, EC1R 3GA, United Kingdom. We have appointed an internal Data Protection Officer (“DPO”) who oversees compliance with data protection legislation and who acts as the primary point of contact for supervisory authorities.',
      'You may contact the DPO or our privacy team by emailing privacy@edulure.com, writing to the address above marked FAO Data Protection Office, or by calling +44 (0)20 3808 7634 between 09:00 and 17:00 UK time on working days. For secure communications you may request our PGP key or submit a ticket through the encrypted portal available to enterprise clients.'
    ]
  },
  {
    heading: '4. Definitions',
    paragraphs: [
      'For ease of reference: “personal data” means any information identifying or relating to an identifiable natural person; “processing” covers any operation performed on personal data; “controller” means the organisation that determines the purpose and means of processing; “processor” means a party that processes personal data on behalf of the controller; “UK GDPR” refers to retained EU Regulation 2016/679; “special category data” includes information revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, trade union membership, genetic data, biometric data, health data, or sexual orientation; “Services” denotes the digital learning products and supporting infrastructure offered by Edulure.'
    ]
  },
  {
    heading: '5. Lawful bases for processing',
    paragraphs: [
      'We only process personal data when we can rely on a lawful basis under Article 6 UK GDPR. The primary lawful bases we utilise are: (a) performance of a contract, for example providing course access to learners or paying instructor revenue shares; (b) legitimate interests, such as ensuring platform security, preventing fraud, optimising product performance, or engaging in reasonable B2B marketing; (c) compliance with legal obligations, including tax reporting, regulatory filings, sanctions screening, and responding to law enforcement requests; and (d) consent, which we obtain for activities like optional marketing communications, certain cookies, and recording customer research interviews. When processing special category data, we rely on explicit consent or another condition under Article 9, such as the establishment, exercise, or defence of legal claims.'
    ]
  },
  {
    heading: '6. Categories of personal data we collect',
    paragraphs: [
      'We collect a broad range of personal data to deliver and improve the Services. This includes identification data (names, titles, date of birth, government-issued documentation for identity verification), contact data (email addresses, postal addresses, telephone numbers), professional and educational history, payment and tax information, account credentials, profile content, preferences, support interactions, location approximations, device identifiers, IP addresses, analytics logs, community posts, uploaded media, assessment results, and survey responses.',
      'We only request special category data in limited scenarios, such as optional demographic reporting that helps us measure inclusivity, accessibility requests, or identity documents where biometric features are inherent. We minimise the data collected, apply strict access controls, and conduct Data Protection Impact Assessments (“DPIAs”) before introducing new data types.'
    ]
  },
  {
    heading: '7. Sources of personal data',
    paragraphs: [
      'Personal data is obtained directly from individuals, automatically through their use of the Services, and from third-party sources. Direct sources include registrations, profile updates, support conversations, community engagements, user-generated content, payment forms, instructor onboarding, and surveys. Automated sources include system telemetry, cookie data, in-app analytics, session replays configured with privacy-safe masking, and security logs. Third-party sources include identity verification providers, payment processors, marketing partners, publicly available professional profiles, references supplied during instructor due diligence, and social sign-in providers when you link your Edulure account.'
    ]
  },
  {
    heading: '8. How we use personal data',
    paragraphs: [
      'We use personal data to operate, maintain, and improve the Services; to authenticate users; to personalise learning journeys; to manage instructor payouts; to provide customer and technical support; to deliver announcements and updates; to conduct research and development; to enforce our terms of service; to protect the integrity of our communities; to prevent spam, fraud, and abuse; to comply with legal obligations; to manage enterprise relationships; and to keep appropriate business records.',
      'We may aggregate or anonymise information so it no longer identifies individuals, and we may use such aggregated insights for analytics, benchmarking, and product innovation. When data is anonymised, it falls outside the scope of data protection law.'
    ]
  },
  {
    heading: '9. Automated decision-making and profiling',
    paragraphs: [
      'Edulure utilises automation to prioritise support tickets, recommend courses, and flag suspicious activity. These systems combine user-supplied information, behavioural telemetry, and reference data. We do not deploy solely automated decisions that produce legal or similarly significant effects without human review. Where automated scoring influences outcomes—such as risk scoring within the instructor identity verification queue—trained compliance analysts review each case before final decisions are issued. You may request human intervention, express your point of view, or contest a decision by emailing privacy@edulure.com.'
    ]
  },
  {
    heading: '10. Special category data and children',
    paragraphs: [
      'Our Services are designed for adults and we do not knowingly collect personal data relating to children under the age of 16. If we discover that we have inadvertently collected such data we will delete it promptly and, where appropriate, notify the child’s parent or guardian. Special category data is only processed when it is strictly necessary—for example verifying identity documents that contain biometric identifiers, or accommodating accessibility needs shared voluntarily. When we process special category data we apply additional safeguards, including explicit consent, encryption at rest, restricted access, and enhanced audit logging.'
    ]
  },
  {
    heading: '11. Sharing personal data',
    paragraphs: [
      'We share personal data with carefully selected processors that help us deliver the Services, such as cloud hosting providers, content delivery networks, payment gateways, identity verification specialists, email delivery services, analytics platforms, customer support tools, background screening firms, and professional advisors. Each processor is bound by contract to process personal data only on our documented instructions, to implement appropriate security measures, and to assist us in fulfilling data subject rights.',
      'We may also share personal data with controllers where we have a legitimate basis to do so, including enterprise clients (instructor performance data and learner engagement analytics under a subscription agreement), integration partners (when you request data transfers), or regulators and law enforcement (when legally required). We do not sell personal data.'
    ]
  },
  {
    heading: '12. International transfers',
    paragraphs: [
      'Personal data may be transferred outside the United Kingdom when we engage service providers or when users access the platform from abroad. We ensure that appropriate safeguards are in place, such as adequacy decisions, the UK International Data Transfer Agreement, the UK Addendum to the EU Standard Contractual Clauses, or Binding Corporate Rules. Where required we conduct transfer impact assessments to evaluate the legal landscape of destination countries and implement supplementary measures—such as encryption or pseudonymisation—to uphold equivalent protection.'
    ]
  },
  {
    heading: '13. Data retention and deletion',
    paragraphs: [
      'We retain personal data only for as long as necessary to fulfil the purposes outlined in this Privacy Policy, including satisfying legal, accounting, or reporting obligations. Instructor and learner account data is retained while the account is active and for seven years thereafter to maintain tax, contract, and audit records. Verification records and financial documentation may be retained for longer where legally required. System logs are retained for up to 18 months unless extended to investigate security incidents. We maintain a granular retention schedule aligned to business functions, reviewed quarterly by the DPO and legal counsel.',
      'Upon request we will anonymise or delete personal data unless retention is required by law or compelling legitimate interests. When deletion is not possible, for example within immutable backups, we will securely isolate and protect the data from further processing.'
    ]
  },
  {
    heading: '14. Your data protection rights',
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
    paragraphs: [
      'We operate an enterprise-grade workflow for Data Subject Access Requests (DSARs) and other privacy rights submissions. Requests are logged within our privacy operations platform, triaged by the privacy team, and tracked against service-level targets (72 hours for acknowledgement, 30 days for completion unless an extension is notified). Our admin console displays DSAR metrics, open cases, and escalation paths, ensuring parity between the web dashboard and mobile application.',
      'Where requests originate from enterprise clients we coordinate with their administrators to ensure a unified response. We maintain redaction tooling to exclude confidential commercial information and protect the rights and freedoms of others when responding to access requests.'
    ]
  },
  {
    heading: '16. Security measures',
    paragraphs: [
      'Security is foundational to our approach. Edulure applies layered technical and organisational measures including encryption in transit (TLS 1.2 or higher) and at rest (AES-256), strict role-based access controls, hardware security modules for key management, endpoint protection, automated patch management, vulnerability scanning, penetration testing, multi-factor authentication, and security awareness training. Access to production systems is tightly restricted and logged, with elevated privileges granted through time-bound approvals.',
      'We conduct supplier due diligence, maintain secure software development lifecycle practices, implement data loss prevention controls, and follow the principles of least privilege and segregation of duties. The mobile applications share the same security foundations through secure API gateways, certificate pinning, and runtime integrity checks.'
    ]
  },
  {
    heading: '17. Incident response and breach notification',
    paragraphs: [
      'We maintain a documented incident response plan that is rehearsed quarterly. Incidents are categorised by severity, and cross-functional response teams are activated within 30 minutes of detection. We record incident timelines, remediation actions, and lessons learned. Where a personal data breach is likely to result in a risk to individuals, we will notify the ICO without undue delay and, where feasible, within 72 hours of becoming aware of the breach. If the risk is high, we will inform affected individuals promptly, describing the incident, potential consequences, and measures taken or proposed to mitigate adverse effects.'
    ]
  },
  {
    heading: '18. Cookies and similar technologies',
    paragraphs: [
      'Our websites and applications use cookies, SDKs, and similar technologies to provide essential functionality, remember user preferences, enhance performance, and deliver relevant content. Strictly necessary cookies are always active. Analytics, functional, and marketing cookies are optional and deployed based on user preferences captured through our consent management platform. You can adjust your cookie choices at any time via the “Privacy settings” link in the footer of our web experiences or the settings menu within the mobile applications. Detailed descriptions of each cookie category are maintained in the Edulure Cookie Policy.'
    ]
  },
  {
    heading: '19. Marketing communications',
    paragraphs: [
      'We send marketing emails, in-app messages, push notifications, and SMS (where permitted) to share updates about new courses, product features, webinars, and events. We only send direct marketing when we have a lawful basis, typically consent or legitimate interests for business contacts. You may opt out at any time by selecting the unsubscribe link in emails, adjusting your notification preferences within the product, disabling push notifications on your device, or contacting privacy@edulure.com. Transactional communications (such as payment confirmations, service announcements, or security alerts) are necessary for the Services and cannot be opted out of.'
    ]
  },
  {
    heading: '20. Analytics and product research',
    paragraphs: [
      'We perform analytics to understand how our Services are used, identify areas for improvement, measure the effectiveness of marketing campaigns, and conduct product research. We employ privacy-enhancing techniques such as pseudonymisation, aggregation, sampling, and differential privacy where possible. Participation in research programmes—such as user interviews or beta features—will always be optional and supported by appropriate consent forms. Insights derived from analytics are shared with internal teams under least-privilege principles and, where relevant, with enterprise customers in aggregated dashboards.'
    ]
  },
  {
    heading: '21. Community and user-generated content',
    paragraphs: [
      'Edulure hosts communities, discussion boards, live workshops, and peer review spaces. Content posted in these areas may be visible to other users according to the permissions set by community owners. We moderate content using automated filters and trained moderators to enforce our Community Standards. Do not share personal data about others without their consent and avoid disclosing sensitive information in public channels. We may remove content that violates our policies, issue warnings, suspend accounts, or notify relevant authorities where required.'
    ]
  },
  {
    heading: '22. Payments and financial data',
    paragraphs: [
      'Payments are processed by regulated payment providers. We do not store raw card numbers; instead, we receive tokenised references from our processors. We collect limited financial data, such as billing addresses, VAT numbers, payout bank details for instructors, and tax identification numbers required by HMRC or other tax authorities. We implement anti-money laundering and sanctions screening controls to protect the integrity of the platform and fulfil our legal duties.'
    ]
  },
  {
    heading: '23. Instructor-specific processing',
    paragraphs: [
      'Instructors undergo enhanced due diligence, which may include identity verification, right-to-work checks, reference validation, and professional credential assessments. We maintain performance analytics covering course engagement, completion rates, learner feedback, and revenue share calculations. Instructor communications may be monitored for compliance with our Marketplace Guidelines. We use this information to support instructors, surface personalised recommendations, and maintain a trusted marketplace.'
    ]
  },
  {
    heading: '24. Learner-specific processing',
    paragraphs: [
      'Learner profiles store enrolments, course progress, assessment scores, certification status, community participation, and support history. We process this information to deliver tailored learning experiences, track achievements, issue certificates, and provide instructors with aggregated insights. Learners can download a copy of their data and request deletion through the privacy centre. We never require learners to submit unnecessary personal data in order to access learning content.'
    ]
  },
  {
    heading: '25. Mobile application parity',
    paragraphs: [
      'Our mobile applications provide the same privacy controls and transparency features available on the web platform. Users can access privacy settings, manage notifications, export data, submit rights requests, and review audit logs directly within the app. Push notifications operate through platform-specific services (Apple Push Notification service and Firebase Cloud Messaging) with tokens rotated regularly. Mobile telemetry adheres to the principle of data minimisation and is configurable via in-app settings.'
    ]
  },
  {
    heading: '26. Data Protection Impact Assessments',
    paragraphs: [
      'We conduct DPIAs for processing activities that are likely to result in high risk to the rights and freedoms of individuals, such as large-scale profiling, systematic monitoring, or the use of emerging technologies. DPIAs document the nature, scope, context, and purposes of processing; assess necessity and proportionality; evaluate risks; and set out measures to mitigate those risks. Summaries of DPIAs relevant to enterprise clients are available on request under appropriate confidentiality protections.'
    ]
  },
  {
    heading: '27. Record keeping and accountability',
    paragraphs: [
      'We maintain detailed Records of Processing Activities (ROPAs), retention schedules, DPIA registers, vendor assessments, security audit logs, and breach registers. These artefacts are stored within controlled systems, reviewed quarterly, and produced to regulators upon request. Our accountability framework aligns with ICO guidance and integrates with our governance, risk, and compliance tooling to ensure accurate, auditable records.'
    ]
  },
  {
    heading: '28. Training and awareness',
    paragraphs: [
      'All employees, contractors, and temporary staff receive privacy and security training during onboarding and annually thereafter. Role-specific training is provided to teams that process sensitive information, including customer success, engineering, data science, trust and safety, and finance. Completion rates are tracked within the admin console and overdue courses trigger reminders and manager escalations. We reinforce best practices through regular communications, tabletop exercises, and leadership engagement.'
    ]
  },
  {
    heading: '29. Changes to this Privacy Policy',
    paragraphs: [
      'We will update this Privacy Policy from time to time to reflect changes in legislation, regulatory expectations, technology, or our business operations. Material changes will be communicated through email, in-product notifications, or prominent notices on our website prior to the effective date. The “Last updated” date at the top of this page indicates when the policy was most recently revised. Continued use of the Services after the effective date constitutes acceptance of the updated policy.'
    ]
  },
  {
    heading: '30. Complaints and supervisory authority rights',
    paragraphs: [
      'If you believe we have infringed data protection law, you may lodge a complaint with the ICO or with the supervisory authority in the country where you live or work. The ICO can be contacted at Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF, by telephone on +44 (0)303 123 1113, or via www.ico.org.uk. We would appreciate the opportunity to address your concerns directly before you approach the ICO, so please contact us in the first instance.'
    ]
  },
  {
    heading: '31. Contacting us',
    paragraphs: [
      'To exercise your rights, ask questions about this Privacy Policy, request copies of our policies, or raise a concern, please contact the Data Protection Office using the details provided in Section 3. For time-sensitive or confidential matters, label your communication “GDPR request” and provide a secure return channel.'
    ]
  },
  {
    heading: '32. Review schedule and document control',
    paragraphs: [
      'This Privacy Policy is reviewed at least annually, or sooner if triggered by significant legal or operational change. Version history, reviewer names, and approval timestamps are maintained within our policy management platform. The Head of Legal signs off on updates after consultation with the DPO, Chief Information Security Officer, and relevant business owners. Printed copies are uncontrolled; the definitive version is the digital policy published on the Edulure website.'
    ]
  }
];

const reviewSummary = [
  { label: 'Policy owner', value: policyOwner },
  { label: 'Data Protection Officer', value: 'Amelia Cross, dpo@edulure.com' },
  { label: 'Registered office', value: 'Labs Atrium, 60A Farringdon Road, London, EC1R 3GA, United Kingdom' },
  { label: 'ICO registration number', value: 'ZB765432' },
  { label: 'Next scheduled review', value: 'May 2025 (or sooner if material change occurs)' }
];

export default function Privacy() {
  usePageMetadata({
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
      dateModified: lastUpdatedDate,
      jurisdiction: companyProfile.jurisdiction
    },
    analytics: {
      page_type: 'privacy_notice'
    }
  });

  return (
    <div className="bg-white text-slate-700">
      <PageHero
        title="Privacy Policy"
        subtitle="Your trust matters. Learn how we protect and manage personal data across the Edulure platform."
      />

      <section className="mx-auto max-w-5xl space-y-10 px-6 py-16">
        <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last updated</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{lastUpdated}</p>
            </div>
            <div className="text-sm text-slate-600">
              <p>
                {`This policy is owned by ${policyOwner}. It covers all Edulure Services, including our web platform, mobile applications, community features, analytics tooling, and enterprise offerings.`}
              </p>
            </div>
          </div>
          <dl className="mt-6 grid gap-4 md:grid-cols-2">
            {reviewSummary.map((item) => (
              <div key={item.label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</dt>
                <dd className="mt-1 text-sm text-slate-700">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {privacyPolicy.map((section) => (
          <article key={section.heading} className="space-y-4">
            <h2 className="text-2xl font-semibold text-slate-900">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="leading-relaxed text-slate-600">
                {paragraph}
              </p>
            ))}
            {section.bullets ? (
              <ul className="list-disc space-y-2 pl-6 text-slate-600">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="leading-relaxed">
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}

        <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-slate-100 shadow-lg">
          <h3 className="text-xl font-semibold text-white">Need assistance?</h3>
          <p className="mt-3 leading-relaxed text-slate-200">
            If you have questions, concerns, or require assistance with privacy matters, please email privacy@edulure.com or
            write to Blackwellen Ltd, Labs Atrium, 60A Farringdon Road, London, EC1R 3GA, United Kingdom. For secure submissions,
            request encrypted channel details from our Data Protection Office.
          </p>
        </div>
      </section>
    </div>
  );
}
