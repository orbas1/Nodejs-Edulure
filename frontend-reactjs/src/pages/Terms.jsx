import PageHero from '../components/PageHero.jsx';

const termsSections = [
  {
    heading: '1. Acceptance of terms',
    body:
      'By creating an account or using Edulure services, you agree to these Terms and our Privacy Policy. If you represent an organization, you confirm that you have authority to bind that organization to these terms.'
  },
  {
    heading: '2. Platform access',
    body:
      'We grant you a limited, revocable license to access our learning tools and communities. You agree not to misuse the platform, infringe on intellectual property, or engage in activity that harms other members.'
  },
  {
    heading: '3. Payments & subscriptions',
    body:
      'Premium courses, tutoring, and community memberships may carry fees. Pricing and billing schedules are shared before you commit, and refunds follow the policies communicated for each product experience.'
  },
  {
    heading: '4. Instructor obligations',
    body:
      'Instructors must ensure that content is original or properly licensed, maintain required certifications, and respect learner privacy. We reserve the right to remove content or suspend accounts that violate these standards.'
  },
  {
    heading: '5. Limitation of liability',
    body:
      'Edulure provides the platform “as is” and disclaims warranties to the fullest extent permitted by law. Our liability is limited to the amount you paid to us in the 12 months preceding the claim.'
  }
];

export default function Terms() {
  return (
    <div className="bg-white text-slate-700">
      <PageHero
        title="Terms & Conditions"
        subtitle="Understand the agreements that support safe, equitable collaboration across the Edulure community."
      />

      <section className="mx-auto max-w-4xl space-y-10 px-6 py-16">
        {termsSections.map((section) => (
          <article key={section.heading} className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">{section.heading}</h2>
            <p className="leading-relaxed text-slate-600">{section.body}</p>
          </article>
        ))}

        <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6">
          <h3 className="text-lg font-semibold text-slate-900">Questions?</h3>
          <p className="mt-3 leading-relaxed text-slate-600">
            Our support team can clarify how these terms apply to your learning goals or instructor programs. Email
            support@edulure.com for assistance.
          </p>
        </div>
      </section>
    </div>
  );
}
