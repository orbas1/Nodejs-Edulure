import { useMemo } from 'react';

import PageHero from '../components/PageHero.jsx';
import usePageMetadata from '../hooks/usePageMetadata.js';

const companyHighlights = [
  {
    title: 'Our Mission',
    description:
      'Empower lifelong learners and educators through an inclusive platform that blends live learning, community collaboration, and trusted credentials.'
  },
  {
    title: 'What We Offer',
    description:
      'Dynamic learning communities, real-time tutoring, and curated content that help learners progress with confidence and instructors scale their impact.'
  },
  {
    title: 'How We Work',
    description:
      'We partner with subject matter experts, leverage modern technology, and listen to our community to continuously refine the Edulure experience.'
  }
];

const corporateFacts = [
  { label: 'Registered company', value: 'Blackwellen Ltd (England & Wales)' },
  { label: 'Company number', value: '10846219' },
  { label: 'Registered office', value: '71-75 Shelton Street, London, WC2H 9JQ, United Kingdom' },
  { label: 'ICO registration', value: 'ZB765432' },
  { label: 'Primary regulator', value: 'Information Commissioner’s Office (ICO), United Kingdom' }
];

const governanceLinks = [
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Privacy Notice', href: '/privacy' },
  { label: 'Trust & Security Centre', href: '/docs/trust-centre' }
];

export default function About() {
  const structuredData = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Blackwellen Ltd',
      url: 'https://www.edulure.com',
      brand: {
        '@type': 'Brand',
        name: 'Edulure'
      },
      sameAs: ['https://www.linkedin.com/company/edulure']
    }),
    []
  );

  usePageMetadata({
    title: 'About Edulure',
    description:
      'Learn how Blackwellen Ltd builds Edulure, the learner-first platform blending live education, community, and compliance-grade operations.',
    canonicalPath: '/about',
    structuredData,
    analytics: {
      page_type: 'about_company'
    }
  });

  return (
    <div className="bg-white text-slate-700">
      <PageHero
        title="About Edulure"
        subtitle="Building a global learning ecosystem where curiosity thrives and expertise grows."
      />

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-8 md:grid-cols-3">
          {companyHighlights.map((item) => (
            <article
              key={item.title}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-4 leading-relaxed text-slate-600">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-50/70">
        <div className="mx-auto grid max-w-5xl gap-12 px-6 py-16 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Learner-first values</h2>
            <p className="mt-4 leading-relaxed">
              Transparency, accessibility, and trust guide everything we build. From the way we manage data to the
              opportunities we curate, we strive to create an environment where both learners and instructors can thrive.
            </p>
            <p className="mt-4 leading-relaxed">
              Our team spans educators, technologists, and community builders united by a shared belief that education
              should be dynamic, collaborative, and equitable.
            </p>
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
              <h3 className="text-lg font-semibold text-slate-900">Global community</h3>
              <p className="mt-3 leading-relaxed text-slate-600">
                We support learners and instructors in 40+ countries with localized experiences, diverse communities, and
                hybrid learning opportunities.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
              <h3 className="text-lg font-semibold text-slate-900">Ethical innovation</h3>
              <p className="mt-3 leading-relaxed text-slate-600">
                Every feature goes through rigorous privacy and accessibility reviews so you can focus on learning with
                confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-2xl font-semibold text-slate-900">Meet the team</h2>
        <p className="mt-4 max-w-3xl leading-relaxed text-slate-600">
          Edulure is led by a distributed team of educators, product designers, and engineers who believe the future of
          learning is social, immersive, and verified. We actively collaborate with universities, certification bodies,
          and industry partners to ensure the skills you build align with real-world opportunities.
        </p>
        <div className="mt-8 grid gap-6 rounded-3xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">Corporate disclosures</h3>
            <dl className="grid gap-3 text-sm text-slate-600">
              {corporateFacts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{fact.label}</dt>
                  <dd className="mt-1 font-medium text-slate-700">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900">Policies & transparency</h3>
            <p className="text-sm leading-relaxed text-slate-600">
              Access the governance artefacts that keep Edulure accountable to learners, enterprise clients, and regulators.
            </p>
            <ul className="space-y-2 text-sm font-semibold text-primary">
              {governanceLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/10 px-4 py-2 text-primary transition hover:border-primary hover:text-primary-dark"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
