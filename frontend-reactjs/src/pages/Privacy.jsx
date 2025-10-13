import PageHero from '../components/PageHero.jsx';

const privacySections = [
  {
    heading: '1. Information we collect',
    body:
      'We collect information you provide during account creation, profile completion, course participation, and community engagement. This includes contact details, professional history, uploaded content, and communications with other members.'
  },
  {
    heading: '2. How we use information',
    body:
      'Your information powers personalized learning experiences, supports security features like identity verification, and enables us to deliver support and product updates. We never sell personal data and only share it with trusted partners necessary to deliver Edulure services.'
  },
  {
    heading: '3. Data retention & deletion',
    body:
      'Account information is retained while your account is active. You can request deletion at any time, and we anonymize or remove personal data unless legal or compliance obligations require retention.'
  },
  {
    heading: '4. Security practices',
    body:
      'We employ encryption in transit and at rest, continuous monitoring, and independent audits to safeguard your data. Multi-factor authentication and secure login options are available to help protect your account.'
  }
];

export default function Privacy() {
  return (
    <div className="bg-white text-slate-700">
      <PageHero
        title="Privacy Policy"
        subtitle="Your trust matters. Learn how we protect and manage personal data across the Edulure platform."
      />

      <section className="mx-auto max-w-4xl space-y-10 px-6 py-16">
        {privacySections.map((section) => (
          <article key={section.heading} className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">{section.heading}</h2>
            <p className="leading-relaxed text-slate-600">{section.body}</p>
          </article>
        ))}

        <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6">
          <h3 className="text-lg font-semibold text-slate-900">Your privacy rights</h3>
          <p className="mt-3 leading-relaxed text-slate-600">
            You can update your profile, export your data, manage communication preferences, or request account deletion at
            any time. Contact our privacy team at privacy@edulure.com for detailed guidance.
          </p>
        </div>
      </section>
    </div>
  );
}
