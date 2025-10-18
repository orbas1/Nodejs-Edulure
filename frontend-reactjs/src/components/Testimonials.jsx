const testimonials = [
  {
    quote: 'We shipped our cohort in two weeks with the templates and live ops tools.',
    name: 'Lena Ortiz',
    title: 'Founder, CohortCraft'
  },
  {
    quote: 'Billing, scheduling, and community rooms finally live in one workflow.',
    name: 'Noah Winter',
    title: 'Director, Global Learning Lab'
  }
];

export default function Testimonials() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h2 className="text-3xl font-semibold text-slate-900">Trusted by ambitious learning operators</h2>
        <div className="mt-12 grid gap-10 md:grid-cols-2">
          {testimonials.map((testimonial) => (
            <figure key={testimonial.name} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-10 text-left">
              <blockquote className="text-lg leading-8 text-slate-700">“{testimonial.quote}”</blockquote>
              <figcaption className="mt-6 text-sm font-semibold text-slate-900">
                {testimonial.name}
                <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  {testimonial.title}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
