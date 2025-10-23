export const ENTITY_CONFIG = {
  communities: {
    facets: ['visibility', 'category', 'timezone', 'country', 'languages', 'tags'],
    sorts: {
      trending: ['desc(trendScore)'],
      members: ['desc(memberCount)'],
      newest: ['desc(createdAt)']
    },
    defaultSort: 'trending'
  },
  courses: {
    facets: ['category', 'level', 'deliveryFormat', 'languages', 'price.currency', 'tags'],
    sorts: {
      relevance: [],
      rating: ['desc(rating.average)', 'desc(rating.count)'],
      newest: ['desc(releaseAt)'],
      priceLow: ['asc(price.amount)'],
      priceHigh: ['desc(price.amount)']
    },
    defaultSort: 'relevance'
  },
  ebooks: {
    facets: ['categories', 'languages', 'price.currency', 'tags'],
    sorts: {
      relevance: [],
      rating: ['desc(rating.average)', 'desc(rating.count)'],
      newest: ['desc(releaseAt)'],
      readingTime: ['asc(readingTimeMinutes)']
    },
    defaultSort: 'relevance'
  },
  tutors: {
    facets: ['languages', 'skills', 'country', 'isVerified'],
    sorts: {
      relevance: [],
      rating: ['desc(rating.average)', 'desc(rating.count)'],
      priceLow: ['asc(hourlyRate.amount)'],
      priceHigh: ['desc(hourlyRate.amount)'],
      responseTime: ['asc(responseTimeMinutes)']
    },
    defaultSort: 'relevance'
  },
  profiles: {
    facets: ['role', 'languages', 'country', 'communities', 'badges'],
    sorts: {
      relevance: [],
      followers: ['desc(followerCount)'],
      newest: ['desc(createdAt)']
    },
    defaultSort: 'relevance'
  },
  ads: {
    facets: ['status', 'objective', 'targeting.audiences', 'targeting.locations'],
    sorts: {
      performance: ['desc(performanceScore)', 'desc(ctr)'],
      spend: ['desc(spend.total)'],
      newest: ['desc(createdAt)']
    },
    defaultSort: 'performance'
  },
  events: {
    facets: ['type', 'status', 'timezone', 'isTicketed', 'price.currency'],
    sorts: {
      upcoming: ['asc(startAt)'],
      newest: ['desc(createdAt)']
    },
    defaultSort: 'upcoming'
  }
};

export const SUPPORTED_ENTITIES = Object.keys(ENTITY_CONFIG);

export default ENTITY_CONFIG;
