export const MARKETING_TESTIMONIALS = [
  {
    slug: 'lena-ortiz',
    variant: 'testimonial',
    quote: 'We shipped our cohort in two weeks with the templates and live ops tools.',
    authorName: 'Lena Ortiz',
    authorTitle: 'Founder, CohortCraft',
    persona: 'Cohort operations lead',
    featuredProduct: 'Edulure Launch Kits',
    surfaces: ['home', 'learner-register'],
    metadata: {
      localeKeys: {
        quote: 'home.testimonials.items.lena.quote',
        name: 'home.testimonials.items.lena.name',
        role: 'home.testimonials.items.lena.role'
      }
    }
  },
  {
    slug: 'noah-winter',
    variant: 'testimonial',
    quote: 'Billing, scheduling, and community rooms finally live in one workflow.',
    authorName: 'Noah Winter',
    authorTitle: 'Director, Global Learning Lab',
    persona: 'Director of learning innovation',
    featuredProduct: 'Unified campus workspace',
    surfaces: ['home'],
    metadata: {
      localeKeys: {
        quote: 'home.testimonials.items.noah.quote',
        name: 'home.testimonials.items.noah.name',
        role: 'home.testimonials.items.noah.role'
      }
    }
  },
  {
    slug: 'ops-director-horizon',
    variant: 'social_proof',
    quote:
      'Edulure onboarding kept our entire revenue pod aligned in the first week. We knew which communities to launch next.',
    attribution: 'Operations Director · Horizon Collective',
    persona: 'Revenue operations',
    surfaces: ['learner-register'],
    metadata: { channel: 'learner', emphasis: 'onboarding' }
  },
  {
    slug: 'creator-growth-lab',
    variant: 'social_proof',
    quote:
      'The interest tags we submitted here now power our cohort roadmap. Edulure turned those signals into real launches.',
    attribution: 'Program Lead · Creator Growth Lab',
    persona: 'Program lead',
    surfaces: ['learner-register'],
    metadata: { channel: 'learner', emphasis: 'signals' }
  },
  {
    slug: 'global-campus-network',
    variant: 'social_proof',
    quote:
      'International onboarding used to take days. Now the regional preferences we capture sync instantly across dashboards.',
    attribution: 'Learning Ops Manager · Global Campus Network',
    persona: 'Learning operations manager',
    surfaces: ['learner-register'],
    metadata: { channel: 'learner', emphasis: 'international' }
  },
  {
    slug: 'cohort-architect-guild',
    variant: 'social_proof',
    quote:
      'The application captured everything we needed—portfolio links, cohort goals, even marketing campaigns—in one pass.',
    attribution: 'Lead Instructor · Cohort Architect Guild',
    persona: 'Instructor lead',
    surfaces: ['instructor-register'],
    metadata: { channel: 'instructor', emphasis: 'application' }
  },
  {
    slug: 'studio-growth-lab',
    variant: 'social_proof',
    quote: 'Edulure surfaced the right learners as soon as we submitted the form. Our waitlist converted within days.',
    attribution: 'Founder · Studio Growth Lab',
    persona: 'Studio founder',
    surfaces: ['instructor-register'],
    metadata: { channel: 'instructor', emphasis: 'conversion' }
  }
];

function normaliseList(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
}

function normaliseSurface(surface) {
  return typeof surface === 'string' ? surface.trim().toLowerCase() : null;
}

export function getFallbackTestimonials({ variants, surfaces } = {}) {
  const variantList = normaliseList(variants)
    .map((variant) => (typeof variant === 'string' ? variant.trim().toLowerCase() : null))
    .filter(Boolean);
  const surfaceSet = new Set(
    normaliseList(surfaces)
      .map((surface) => normaliseSurface(surface))
      .filter(Boolean)
  );

  return MARKETING_TESTIMONIALS.filter((testimonial) => {
    const matchesVariant =
      !variantList.length || variantList.includes((testimonial.variant ?? 'testimonial').toLowerCase());
    if (!matchesVariant) {
      return false;
    }

    if (!surfaceSet.size) {
      return true;
    }

    const testimonialSurfaces = (testimonial.surfaces ?? [])
      .map((surface) => normaliseSurface(surface))
      .filter(Boolean);

    if (!testimonialSurfaces.length) {
      return true;
    }

    return testimonialSurfaces.some((surface) => surfaceSet.has(surface));
  });
}

export function buildTestimonialDictionary() {
  const testimonials = getFallbackTestimonials({ variants: ['testimonial'] });
  return testimonials.reduce((accumulator, testimonial) => {
    accumulator[testimonial.slug] = {
      quote: testimonial.quote,
      name: testimonial.authorName,
      role: testimonial.authorTitle ?? testimonial.attribution ?? ''
    };
    return accumulator;
  }, {});
}

export function mapTestimonialsToFallbacks({ surfaces } = {}) {
  const testimonials = getFallbackTestimonials({ variants: ['testimonial'], surfaces });
  return testimonials.map((testimonial) => ({
    key: testimonial.slug,
    fallback: {
      quote: testimonial.quote,
      name: testimonial.authorName,
      role: testimonial.authorTitle ?? testimonial.attribution ?? ''
    }
  }));
}

export function resolveSocialProofFallback(surface) {
  const entries = getFallbackTestimonials({ variants: ['social_proof'], surfaces: normaliseList(surface) });
  return entries.map((entry) => ({
    id: entry.slug,
    quote: entry.quote,
    attribution: entry.attribution ?? [entry.authorName, entry.authorTitle].filter(Boolean).join(' • ')
  }));
}
