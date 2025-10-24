import { useMemo } from 'react';

import HomeSection from './home/HomeSection.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { mapTestimonialsToFallbacks } from '../data/marketing/testimonials.js';
import useMarketingContent from '../hooks/useMarketingContent.js';

const FALLBACK_TESTIMONIALS = mapTestimonialsToFallbacks({ surfaces: ['home'] });

export default function Testimonials() {
  const { t } = useLanguage();
  const { data } = useMarketingContent({ surfaces: ['home'], variants: ['testimonial'] });

  const testimonialEntries = useMemo(() => {
    const remoteTestimonials = Array.isArray(data?.testimonials)
      ? data.testimonials.filter((entry) => entry.variant === 'testimonial')
      : [];

    if (remoteTestimonials.length > 0) {
      return remoteTestimonials.map((entry) => ({
        key: entry.id ?? entry.slug,
        fallback: {
          quote: entry.quote,
          name: entry.authorName ?? entry.attribution ?? t('home.testimonials.defaults.name', 'Edulure operator'),
          role: entry.authorTitle ?? entry.attribution ?? ''
        }
      }));
    }

    return FALLBACK_TESTIMONIALS;
  }, [data, t]);

  const heading = t(
    'home.testimonials.heading',
    'Trusted by ambitious learning operators'
  );

  const testimonials = testimonialEntries.map((testimonial) => ({
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
