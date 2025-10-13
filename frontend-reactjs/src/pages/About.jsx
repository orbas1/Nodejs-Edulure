import PageHero from '../components/PageHero.jsx';

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

export default function About() {
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
      </section>
    </div>
  );
}
