export const ENTITY_CONFIG = {
  communities: {
    facets: ['visibility', 'category', 'tags', 'topics', 'timezone', 'country', 'languages'],
    sorts: {
      trending: { type: 'json', path: '$.sort.trendScore', direction: 'desc' },
      members: { type: 'json', path: '$.sort.memberCount', direction: 'desc' },
      newest: { type: 'json', path: '$.sort.createdAt', direction: 'desc' }
    },
    defaultSort: 'trending'
  },
  courses: {
    facets: ['category', 'level', 'deliveryFormat', 'languages', 'tags', 'price.currency', 'isPublished'],
    sorts: {
      relevance: { type: 'relevance', direction: 'desc' },
      rating: { type: 'json', path: '$.sort.ratingAverage', direction: 'desc' },
      newest: { type: 'json', path: '$.sort.releaseAt', direction: 'desc' },
      priceLow: { type: 'json', path: '$.sort.priceAmount', direction: 'asc' },
      priceHigh: { type: 'json', path: '$.sort.priceAmount', direction: 'desc' }
    },
    defaultSort: 'relevance'
  },
  ebooks: {
    facets: ['categories', 'languages', 'tags', 'price.currency', 'status'],
    sorts: {
      relevance: { type: 'relevance', direction: 'desc' },
      rating: { type: 'json', path: '$.sort.ratingAverage', direction: 'desc' },
      newest: { type: 'json', path: '$.sort.releaseAt', direction: 'desc' },
      readingTime: { type: 'json', path: '$.sort.readingTimeMinutes', direction: 'asc' }
    },
    defaultSort: 'relevance'
  },
  tutors: {
    facets: ['languages', 'skills', 'country', 'isVerified'],
    sorts: {
      relevance: { type: 'relevance', direction: 'desc' },
      rating: { type: 'json', path: '$.sort.ratingAverage', direction: 'desc' },
      priceLow: { type: 'json', path: '$.sort.hourlyRateAmount', direction: 'asc' },
      priceHigh: { type: 'json', path: '$.sort.hourlyRateAmount', direction: 'desc' },
      responseTime: { type: 'json', path: '$.sort.responseTimeMinutes', direction: 'asc' }
    },
    defaultSort: 'relevance'
  },
  profiles: {
    facets: ['role', 'languages', 'country', 'communities', 'badges'],
    sorts: {
      relevance: { type: 'relevance', direction: 'desc' },
      followers: { type: 'json', path: '$.sort.followers', direction: 'desc' },
      newest: { type: 'json', path: '$.sort.createdAt', direction: 'desc' }
    },
    defaultSort: 'relevance'
  },
  ads: {
    facets: ['status', 'objective', 'targeting.audiences', 'targeting.locations', 'targeting.languages'],
    sorts: {
      performance: { type: 'json', path: '$.sort.performanceScore', direction: 'desc' },
      spend: { type: 'json', path: '$.sort.spendTotalCents', direction: 'desc' },
      newest: { type: 'json', path: '$.sort.createdAt', direction: 'desc' }
    },
    defaultSort: 'performance'
  },
  events: {
    facets: ['type', 'status', 'timezone', 'isTicketed', 'price.currency'],
    sorts: {
      upcoming: { type: 'json', path: '$.sort.startAt', direction: 'asc' },
      newest: { type: 'json', path: '$.sort.createdAt', direction: 'desc' }
    },
    defaultSort: 'upcoming'
  }
};

export const SUPPORTED_ENTITIES = Object.keys(ENTITY_CONFIG);

export function getEntityConfig(entity) {
  return ENTITY_CONFIG[entity] ?? null;
}
