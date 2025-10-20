import HomeSection from './home/HomeSection.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const TESTIMONIALS = [
  {
    key: 'lena',
    fallback: {
      quote: 'We shipped our cohort in two weeks with the templates and live ops tools.',
      name: 'Lena Ortiz',
      role: 'Founder, CohortCraft'
    }
  },
  {
    key: 'noah',
    fallback: {
      quote: 'Billing, scheduling, and community rooms finally live in one workflow.',
      name: 'Noah Winter',
      role: 'Director, Global Learning Lab'
    }
  }
];

export default function Testimonials() {
  const { t } = useLanguage();

  const heading = t(
    'home.testimonials.heading',
    'Trusted by ambitious learning operators'
  );

  const testimonials = TESTIMONIALS.map((testimonial) => ({
    key: testimonial.key,
    quote: t(
      `home.testimonials.items.${testimonial.key}.quote`,
      testimonial.fallback.quote
    ),
    name: t(`home.testimonials.items.${testimonial.key}.name`, testimonial.fallback.name),
    role: t(`home.testimonials.items.${testimonial.key}.role`, testimonial.fallback.role)
  }));

  return (
    <section className="bg-white">
      <HomeSection size="max-w-5xl" pad="py-20" className="text-center">
        <h2 className="text-3xl font-semibold text-slate-900">{heading}</h2>
        <div className="mt-12 grid gap-10 text-left md:grid-cols-2">
          {testimonials.map((testimonial) => (
            <figure
              key={testimonial.key}
              className="rounded-3xl border border-slate-200 bg-slate-50/80 p-10"
            >
              <blockquote className="text-lg leading-8 text-slate-700">
                “{testimonial.quote}”
              </blockquote>
              <figcaption className="mt-6 text-sm font-semibold text-slate-900">
                {testimonial.name}
                <span className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                  {testimonial.role}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </HomeSection>
    </section>
  );
}
